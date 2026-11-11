import { SpanKind } from "@opentelemetry/api";
import {
  initializeTracing,
  type TracingPolicy,
} from "@quantile-co/factory-otel/tracing";

const policy: TracingPolicy = {
  serviceName: "quantile.co-web",
  spanName: "HTTP request",
  sample: ({ kind, attributes }) =>
    kind === SpanKind.SERVER &&
    attributes["next.span_type"] === "BaseServer.handleRequest",
  attributes(attributes) {
    const safe: ReturnType<TracingPolicy["attributes"]> = {};
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
  },
};

const state = globalThis as typeof globalThis & {
  __quantileTracingRegistration?: Promise<void>;
};

export async function registerTracing() {
  state.__quantileTracingRegistration ??= initializeTracing(policy).then(
    (tracing) => {
      if (!tracing) return;
      // Passive, bounded best-effort flush; Next retains shutdown/exit ownership.
      // Cloud Run can suspend CPU or exit before I/O finishes. No delivery guarantee.
      const flush = () => {
        void tracing.flush();
      };
      for (const event of ["SIGINT", "SIGTERM", "beforeExit"] as const)
        process.once(event, flush);
    },
  );
  await state.__quantileTracingRegistration;
}
