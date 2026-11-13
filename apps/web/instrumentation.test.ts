import type { Configuration } from "@vercel/otel";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { register } from "./instrumentation";

const native = vi.hoisted(() => ({
  register: vi.fn<(config: Configuration) => void>(),
  flush: vi.fn<() => Promise<void>>(),
}));
vi.mock("@vercel/otel", () => ({
  registerOTel: native.register,
  OTLPHttpJsonTraceExporter: class {},
}));
vi.mock("@opentelemetry/sdk-trace-base", () => ({
  SimpleSpanProcessor: class {
    forceFlush = native.flush;
  },
}));
const events = ["SIGINT", "SIGTERM", "beforeExit"] as const;
const originalListeners = new Map(
  events.map((event) => [event, process.listeners(event)]),
);

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NEXT_OTEL_VERBOSE", undefined);
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", "https://ingest.example.invalid");
  vi.stubEnv("CLICKSTACK_API_KEY", "fixture-key");
  vi.stubEnv("OTEL_EXPORTER_OTLP_HEADERS", undefined);
  vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_HEADERS", undefined);
  native.flush.mockResolvedValue();
});
afterEach(() => {
  for (const event of events)
    for (const listener of process.listeners(event))
      if (!originalListeners.get(event)?.includes(listener))
        process.removeListener(event, listener);
  delete (globalThis as { __quantileTracingRegistration?: Promise<void> })
    .__quantileTracingRegistration;
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

it.each(["edge", undefined])(
  "does not initialize outside Node (%s)",
  async (runtime) => {
    vi.stubEnv("NEXT_RUNTIME", runtime);
    await register();
    expect(native.register).not.toHaveBeenCalled();
  },
);

it("registers the native framework once without projection or duplicate fetch instrumentation", async () => {
  await Promise.all([register(), register()]);
  vi.resetModules();
  await (await import("./instrumentation")).register();
  expect(native.register).toHaveBeenCalledTimes(1);
  expect(native.register.mock.calls[0][0]).toEqual({
    serviceName: "quantile.co-web",
    spanProcessors: [expect.anything()],
    instrumentations: [],
    propagators: ["tracecontext", "baggage"],
  });
  expect(process.env.NEXT_OTEL_VERBOSE).toBe("1");
  for (const event of events) {
    const added = process
      .listeners(event)
      .filter((listener) => !originalListeners.get(event)?.includes(listener));
    expect(added).toHaveLength(1);
    added[0](0);
  }
  expect(native.flush).toHaveBeenCalledTimes(3);
});

it("remains disabled without ingestion configuration", async () => {
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", undefined);
  vi.stubEnv("CLICKSTACK_API_KEY", undefined);
  await register();
  expect(native.register).not.toHaveBeenCalled();
  for (const event of events)
    expect(process.listeners(event)).toEqual(originalListeners.get(event));
});
