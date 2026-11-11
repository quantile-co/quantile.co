// biome-ignore-all lint/style/noProcessEnv: Next's server-only runtime configuration entry point.
import type { Attributes } from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace";

const state = globalThis as typeof globalThis & {
  __quantileClickStack?: Promise<void>;
};
const failure = () => new Error("ClickStack tracing initialization failed");

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const endpoint = process.env.CLICKSTACK_OTLP_ENDPOINT;
  const key = process.env.CLICKSTACK_API_KEY;
  if (endpoint === undefined && key === undefined) return;

  // Never include configuration values or the underlying error in diagnostics.
  let url: URL;
  try {
    if (!endpoint || !key || !/^[\x21-\x7e]+$/.test(key)) throw failure();
    url = new URL(endpoint);
    if (
      !endpoint.startsWith("https://") ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /[\s?#\\]/.test(endpoint) ||
      /\/v1\/(traces|logs|metrics)\/*$/.test(url.pathname)
    )
      throw failure();
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/v1/traces`;
  } catch {
    throw failure();
  }

  // Also survives module reloads; never register competing exporters/providers.
  state.__quantileClickStack ??= start(url.href, key).catch(() => {
    throw failure();
  });
  await state.__quantileClickStack;
}

async function start(url: string, key: string) {
  const [
    { trace, context, SpanKind },
    { resourceFromAttributes },
    sdk,
    otlp,
    { AsyncLocalStorageContextManager },
  ] = await Promise.all([
    import("@opentelemetry/api"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-trace"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/context-async-hooks"),
  ]);

  const resource = resourceFromAttributes({
    "service.name": "quantile.co-web",
  });
  const batch = new sdk.BatchSpanProcessor({
    // Start export at span end rather than waiting for an idle batch timer.
    // Cloud Run can still suspend CPU before I/O completes: best-effort only.
    maxExportBatchSize: 1,
    maxQueueSize: 128,
    exportTimeoutMillis: 10_000,
    exporter: new otlp.OTLPTraceExporter({
      url,
      headers: { authorization: `Bearer ${key}` },
      timeoutMillis: 10_000,
    }),
  });
  const provider = new sdk.TracerProvider({
    resource,
    // No HTTP/fetch auto-instrumentation, resource detectors, logs or metrics.
    // Only Next's request spans are sampled; incoming trace/baggage propagation
    // is not installed.
    sampler: {
      shouldSample: (_context, _id, _name, kind, attributes) => ({
        decision:
          kind === SpanKind.SERVER &&
          attributes["next.span_type"] === "BaseServer.handleRequest"
            ? sdk.SamplingDecision.RECORD_AND_SAMPLED
            : sdk.SamplingDecision.NOT_RECORD,
      }),
      toString: () => "WebsiteRequestsOnly",
    },
    spanLimits: { eventCountLimit: 0, linkCountLimit: 0 },
    spanProcessors: [
      {
        onStart() {},
        onEnd(span) {
          // Next includes raw targets and error text. Construct a new, strictly
          // allowlisted span BEFORE batching; never spread the original span.
          const { traceId, spanId, traceFlags } = span.spanContext();
          const safe: ReadableSpan = {
            name: "HTTP request",
            kind: SpanKind.SERVER,
            spanContext: () => ({ traceId, spanId, traceFlags }),
            startTime: span.startTime,
            endTime: span.endTime,
            duration: span.duration,
            ended: span.ended,
            status: { code: span.status.code },
            attributes: safeAttributes(span.attributes),
            events: [],
            links: [],
            resource,
            instrumentationScope: { name: "quantile.co-web" },
            droppedAttributesCount: 0,
            droppedEventsCount: 0,
            droppedLinksCount: 0,
          };
          batch.onEnd(safe);
        },
        forceFlush: () => batch.forceFlush(),
        shutdown: () => batch.shutdown(),
      },
    ],
  });
  // Next uses async context to attach the matched route to its request span.
  const manager = new AsyncLocalStorageContextManager().enable();
  if (!context.setGlobalContextManager(manager)) {
    manager.disable();
    await provider.shutdown();
    throw failure();
  }
  if (!trace.setGlobalTracerProvider(provider)) {
    context.disable();
    await provider.shutdown();
    throw failure();
  }
}

function safeAttributes(attributes: Attributes): Attributes {
  const safe: Attributes = {};
  const method = attributes["http.method"];
  if (
    typeof method === "string" &&
    ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(
      method,
    )
  )
    safe["http.method"] = method;
  const status = attributes["http.status_code"];
  if (
    typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
  )
    safe["http.status_code"] = status;
  const route = attributes["http.route"] ?? attributes["next.route"];
  // Unknown paths, including 404 input, must never become telemetry dimensions.
  if (
    typeof route === "string" &&
    ["/", "/brand", "/robots.txt", "/sitemap.xml", "/_not-found"].includes(
      route,
    )
  )
    safe["http.route"] = route;
  return safe;
}
