import { ProxyTracerProvider, trace } from "@opentelemetry/api";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { managedConfig } from "@quantile-co/factory-otel/config";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";

const state = globalThis as typeof globalThis & {
  __quantileTracingRegistration?: Promise<void>;
};

export async function registerTracing() {
  state.__quantileTracingRegistration ??= (async () => {
    try {
      const config = managedConfig();
      if (!config) return;
      // biome-ignore lint/style/noProcessEnv: server-only runtime configuration.
      const env = process.env;
      if (
        env.OTEL_EXPORTER_OTLP_HEADERS ||
        env.OTEL_EXPORTER_OTLP_TRACES_HEADERS
      )
        throw new Error("Ambiguous exporter authentication");
      // The pinned OTel 1.x API exposes its unregistered proxy. Do not let the
      // framework install instrumentation over another integration's provider.
      const provider = trace.getTracerProvider();
      if (
        !(provider instanceof ProxyTracerProvider) ||
        provider.getDelegateTracer("quantile.co-web")
      )
        throw new Error("A tracing provider is already registered");
      // Start exporting on span end; request-based Cloud Run can suspend CPU
      // before a batch timer runs. Delivery remains best-effort, not guaranteed.
      const processor = new SimpleSpanProcessor(
        new OTLPHttpJsonTraceExporter({
          url: `${config.endpoint}/v1/traces`,
          headers: { authorization: `Bearer ${config.key}` },
        }),
      );
      env.NEXT_OTEL_VERBOSE ??= "1";
      registerOTel({
        serviceName: "quantile.co-web",
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
