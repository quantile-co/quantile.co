import {
  context,
  createTraceState,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import {
  afterEach,
  beforeEach,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { register } from "./instrumentation";

const events = ["SIGINT", "SIGTERM", "beforeExit"] as const;
const originalListeners = new Map(
  events.map((event) => [event, process.listeners(event)]),
);
let registration: MockInstance<typeof trace.setGlobalTracerProvider>;
beforeEach(() => {
  registration = vi.spyOn(trace, "setGlobalTracerProvider");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NEXT_OTEL_VERBOSE", undefined);
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", "https://ingest.example.test:4318");
  vi.stubEnv("CLICKSTACK_API_KEY", "synthetic-ingestion-key");
  vi.stubEnv("OTEL_EXPORTER_OTLP_HEADERS", undefined);
  vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_HEADERS", undefined);
});
afterEach(async () => {
  for (const [provider] of registration.mock.calls)
    await (
      provider as typeof provider & { shutdown?(): Promise<void> }
    ).shutdown?.();
  trace.disable();
  context.disable();
  propagation.disable();
  for (const event of events)
    for (const listener of process.listeners(event))
      if (!originalListeners.get(event)?.includes(listener))
        process.removeListener(event, listener);
  delete (globalThis as { __quantileTracingRegistration?: Promise<void> })
    .__quantileTracingRegistration;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each(["path", "partial", "headers", "trace-headers", "existing-provider"])(
  "disables %s without replacing providers or exposing credentials",
  async (scenario) => {
    const previous = trace.getTracer("existing");
    if (scenario === "existing-provider") {
      trace.setGlobalTracerProvider({ getTracer: () => previous });
      registration.mockClear();
    }
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    if (scenario === "path")
      vi.stubEnv(
        "CLICKSTACK_OTLP_ENDPOINT",
        "https://ingest.example.test/private-path",
      );
    if (scenario === "partial") vi.stubEnv("CLICKSTACK_API_KEY", undefined);
    if (scenario === "headers")
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_HEADERS",
        "authorization=synthetic-other-key",
      );
    if (scenario === "trace-headers")
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
        "authorization=synthetic-other-key",
      );
    await expect(register()).resolves.toBeUndefined();
    expect(registration).not.toHaveBeenCalled();
    if (scenario === "existing-provider")
      expect(trace.getTracer("existing")).toBe(previous);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(diagnostics.mock.calls)).not.toMatch(
      /synthetic|ingest.example|private-path/,
    );
  },
);

it("exports intact native spans with parent correlation through the maintained serializer", async () => {
  // Intercept fetch, not the exporter or serializer; no network connection opens.
  const transport = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://unrelated.example.test");
  vi.stubEnv(
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "https://unrelated.example.test/traces",
  );
  await register();
  const tracer = trace.getTracer("fixture-scope");
  const root = tracer.startSpan("GET /brand?fixture=query", {
    kind: SpanKind.SERVER,
    attributes: {
      "http.route": "/brand",
      "http.target": "/brand?fixture=query",
      "fixture.array": ["one", "two"],
      "fixture.long": "x".repeat(1024),
    },
    links: [
      {
        context: {
          traceId: "1".repeat(32),
          spanId: "2".repeat(16),
          traceFlags: 1,
          traceState: createTraceState("fixture=value"),
        },
      },
    ],
  });
  root.setStatus({ code: SpanStatusCode.ERROR, message: "fixture-status" });
  root.recordException(new Error("fixture-error"));
  root.addEvent("fixture-event");
  tracer
    .startSpan(
      "render /brand",
      { kind: SpanKind.INTERNAL },
      trace.setSpan(context.active(), root),
    )
    .end();
  root.end();
  // No forceFlush or batch timer is needed to begin export on span end.
  await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
  const spans = transport.mock.calls.flatMap(([url, options]) => {
    expect(String(url)).toBe("https://ingest.example.test:4318/v1/traces");
    expect(options?.method).toBe("POST");
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer synthetic-ingestion-key",
    );
    const body = String(options?.body);
    expect(body).not.toContain("synthetic-ingestion-key");
    return JSON.parse(body).resourceSpans.flatMap(
      (resource: { scopeSpans: { spans: Record<string, unknown>[] }[] }) =>
        resource.scopeSpans.flatMap((scope) => scope.spans),
    );
  });
  expect(spans).toHaveLength(2);
  const exported = spans.find(
    (span: { name: string }) => span.name === "GET /brand?fixture=query",
  );
  const child = spans.find(
    (span: { name: string }) => span.name === "render /brand",
  );
  expect(child.parentSpanId).toBe(exported.spanId);
  expect(child.traceId).toBe(exported.traceId);
  expect(exported.status).toMatchObject({ code: 2, message: "fixture-status" });
  expect(exported.events.map((event: { name: string }) => event.name)).toEqual([
    "exception",
    "fixture-event",
  ]);
  expect(exported.links[0].traceId).toBe("1".repeat(32));
  expect(exported.attributes).toContainEqual({
    key: "fixture.long",
    value: { stringValue: "x".repeat(1024) },
  });
  expect(exported.attributes).toContainEqual({
    key: "fixture.array",
    value: {
      arrayValue: { values: [{ stringValue: "one" }, { stringValue: "two" }] },
    },
  });
});
