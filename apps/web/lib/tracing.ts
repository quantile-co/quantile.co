import { ProxyTracerProvider, trace } from "@opentelemetry/api";
import {
  SimpleSpanProcessor,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";

const account =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default";

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Telemetry identity unavailable");
  return response;
}

async function mint(endpoint: URL) {
  const audience = endpoint.origin;
  const headers = { "Metadata-Flavor": "Google" };
  const [email, access] = await Promise.all([
    request(account + "/email", { headers }).then((r) => r.text()),
    request(account + "/token", { headers }).then((r) => r.json()),
  ]);
  if (
    !/^[^@\s/]+@[\w.-]+\.gserviceaccount\.com$/.test(email) ||
    typeof access?.access_token !== "string" ||
    !access.access_token
  )
    throw new Error("Missing workload identity");
  const url =
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
    encodeURIComponent(email) +
    ":generateIdToken";
  const { token } = await (
    await request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${access.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audience,
        includeEmail: true,
        organizationNumberIncluded: true,
      }),
    })
  ).json();
  if (typeof token !== "string") throw new Error("Missing identity token");
  // The recipient verifies the signature. Decode exp here only to schedule renewal.
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  if (
    !Number.isSafeInteger(claims.exp) ||
    claims.exp * 1000 <= Date.now() + 60_000 ||
    claims.aud !== audience
  )
    throw new Error("Unusable identity token");
  return {
    until: claims.exp * 1000 - 60_000,
    exporter: new OTLPHttpJsonTraceExporter({
      url: endpoint.href,
      timeoutMillis: 5000,
      headers: { authorization: `Bearer ${token}` },
    }),
  };
}

// Refresh on demand (Cloud Run may suspend CPU between requests). Coalesce
// concurrent span exports and never fall back to an unauthenticated request.
function googleTraceExporter(endpoint: URL): SpanExporter {
  let cached: Awaited<ReturnType<typeof mint>> | undefined;
  let pending: ReturnType<typeof mint> | undefined;
  return {
    export(spans, callback) {
      if (cached && cached.until > Date.now())
        return cached.exporter.export(spans, callback);
      pending ??= mint(endpoint)
        .then((entry) => (cached = entry))
        .finally(() => {
          pending = undefined;
        });
      void pending.then(
        ({ exporter }) => exporter.export(spans, callback),
        () =>
          callback({
            code: 1,
            error: new Error("Telemetry identity unavailable"),
          }),
      );
    },
    async shutdown() {
      await cached?.exporter.shutdown();
    },
  };
}

const state = globalThis as typeof globalThis & {
  __quantileTracingRegistration?: Promise<void>;
};

export async function registerTracing(endpoint: string) {
  state.__quantileTracingRegistration ??= (async () => {
    try {
      const url = new URL(endpoint);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error("Invalid trace endpoint");
      // biome-ignore lint/style/noProcessEnv: server-only runtime configuration.
      const env = process.env;
      if (
        (env.OTEL_EXPORTER_OTLP_HEADERS ?? "") !== "" ||
        (env.OTEL_EXPORTER_OTLP_TRACES_HEADERS ?? "") !== ""
      )
        throw new Error("Ambiguous exporter authentication");
      // The pinned OTel 1.x API exposes its unregistered proxy. Do not let the
      // framework install instrumentation over another integration's provider.
      const provider = trace.getTracerProvider();
      if (
        !(provider instanceof ProxyTracerProvider) ||
        provider.getDelegateTracer("next")
      )
        throw new Error("A tracing provider is already registered");
      // Start exporting on span end; request-based Cloud Run can suspend CPU
      // before a batch timer runs. Delivery remains best-effort, not guaranteed.
      const processor = new SimpleSpanProcessor(googleTraceExporter(url));
      env.NEXT_OTEL_VERBOSE ??= "1";
      const runtime = Object.fromEntries(
        ["K_SERVICE", "K_REVISION", "K_CONFIGURATION"]
          .filter((key) => env[key] !== undefined)
          .map((key) => [key, env[key]]),
      );
      registerOTel({
        ...(Object.keys(runtime).length && {
          attributes: {
            "quantile.metadata": JSON.stringify([{ [Date.now()]: runtime }]),
          },
        }),
        spanProcessors: [processor],
        // Next already instruments fetch; retain its native spans rather than
        // installing a second fetch wrapper or an ambient/default exporter.
        instrumentations: [],
        propagators: ["tracecontext", "baggage"],
      });
      const flush = () => {
        void processor.forceFlush().catch(() => {
          console.error("OTel trace flush failed.");
        });
      };
      for (const event of ["SIGINT", "SIGTERM", "beforeExit"] as const)
        process.once(event, flush);
    } catch {
      // Fail open without exposing credentials or raw transport diagnostics.
      console.error("OTel tracing initialization unavailable.");
    }
  })();
  await state.__quantileTracingRegistration;
}
