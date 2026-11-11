export async function register() {
  // biome-ignore lint/style/noProcessEnv: Next's server-only runtime entry point.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerTracing } = await import("./lib/tracing");
    await registerTracing();
  }
}
