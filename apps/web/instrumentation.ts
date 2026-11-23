export async function register() {
  // biome-ignore lint/style/noProcessEnv: Next's server-only runtime entry point.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // biome-ignore lint/style/noProcessEnv: server-only OTLP configuration.
    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    if (endpoint === undefined || endpoint === "") return;
    const { registerTracing } = await import("./lib/tracing");
    await registerTracing(endpoint);
  }
}
