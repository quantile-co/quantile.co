import { SpanKind } from "@opentelemetry/api";
import type { Tracing, TracingPolicy } from "@quantile-co/factory-otel/tracing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { register } from "./instrumentation";

const shared = vi.hoisted(() => ({
  initialize: vi.fn<(policy: TracingPolicy) => Promise<Tracing | undefined>>(),
  flush: vi.fn<() => Promise<void>>(),
}));
vi.mock("@quantile-co/factory-otel/tracing", () => ({
  initializeTracing: shared.initialize,
}));
const events = ["SIGINT", "SIGTERM", "beforeExit"] as const;
const originalListeners = new Map(
  events.map((event) => [event, process.listeners(event)]),
);

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  shared.flush.mockResolvedValue();
  shared.initialize.mockResolvedValue({ flush: shared.flush });
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
    expect(shared.initialize).not.toHaveBeenCalled();
  },
);

it("delegates once across concurrent registration and module reloads, with explicit lifecycle flush", async () => {
  await Promise.all([register(), register()]);
  vi.resetModules();
  await (await import("./instrumentation")).register();
  expect(shared.initialize).toHaveBeenCalledTimes(1);
  expect(shared.flush).not.toHaveBeenCalled();
  for (const event of events) {
    const added = process
      .listeners(event)
      .filter((listener) => !originalListeners.get(event)?.includes(listener));
    expect(added).toHaveLength(1);
    added[0](0);
  }
  expect(shared.flush).toHaveBeenCalledTimes(3);
});

it("does not install lifecycle listeners when shared tracing is disabled or unavailable", async () => {
  shared.initialize.mockResolvedValue(undefined);
  await register();
  for (const event of events)
    expect(process.listeners(event)).toEqual(originalListeners.get(event));
});

it("owns the service, fixed name, and request-only sampling policy", async () => {
  await register();
  const policy = shared.initialize.mock.calls[0][0];
  expect(policy.serviceName).toBe("quantile.co-web");
  expect(policy.spanName).toBe("HTTP request");
  for (const kind of [SpanKind.SERVER, SpanKind.CLIENT, SpanKind.INTERNAL])
    for (const type of [
      "BaseServer.handleRequest",
      "AppRender.fetch",
      "AppRender.getBodyResult",
      "unknown",
    ])
      expect(
        policy.sample({
          kind,
          name: "private request name",
          attributes: { "next.span_type": type },
        }),
      ).toBe(kind === SpanKind.SERVER && type === "BaseServer.handleRequest");
});

it("retains only known methods, integer status codes and static route dimensions", async () => {
  await register();
  const policy = shared.initialize.mock.calls[0][0];
  expect(
    policy.attributes({
      "http.method": "GET",
      "http.status_code": 503,
      "next.route": "/brand",
      "http.target": "/brand?secret=query",
      "http.url": "https://private.test/secret",
      "http.request.header.cookie": "secret-cookie",
      "http.request.header.authorization": "secret-auth",
      "http.request.body": "secret-body",
      "next.span_name": "secret-name",
    }),
  ).toEqual({
    "http.method": "GET",
    "http.status_code": 503,
    "http.route": "/brand",
  });
  for (const route of ["/private", "/brand?secret=query", ["/brand"]])
    for (const status of [99, 600, 200.5, "200", Number.NaN])
      expect(
        policy.attributes({
          "http.method": "SECRET",
          "http.status_code": status,
          "http.route": route,
        }),
      ).toEqual({});
});
