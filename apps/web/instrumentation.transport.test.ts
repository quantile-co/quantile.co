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
  vi.stubEnv("QUANTILE_OTLP_ENDPOINT", "https://ingest.example.test:4318");
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

it.each(["path", "headers", "trace-headers", "existing-provider"])(
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
        "QUANTILE_OTLP_ENDPOINT",
        "https://ingest.example.test/private-path",
      );
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
  const audience = "https://ingest.example.test:4318";
  const id =
    "fixture." +
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".fixture";
  const transport = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url, init) => {
      if (String(url).startsWith("http://metadata.google.internal/")) {
        expect(new Headers(init?.headers).get("Metadata-Flavor")).toBe(
          "Google",
        );
        return String(url).endsWith("/email")
          ? new Response("site@fixture.iam.gserviceaccount.com")
          : Response.json({ access_token: "fixture-access" });
      }
      if (String(url).startsWith("https://iamcredentials.googleapis.com/")) {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer fixture-access",
        );
        expect(JSON.parse(String(init?.body))).toEqual({
          audience,
          includeEmail: true,
          organizationNumberIncluded: true,
        });
        return Response.json({ token: id });
      }
      expect(String(url)).toBe(audience + "/gcp/v1/traces");
      return Response.json({});
    });
  vi.stubEnv("K_SERVICE", "application");
  vi.stubEnv("K_REVISION", "application-fixture");
  vi.stubEnv(
    "OTEL_RESOURCE_ATTRIBUTES",
    "service.namespace=quantile-q1,service.name=quantile.co",
  );
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
  await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(5));
  const spans = transport.mock.calls
    .filter(([url]) => String(url).startsWith(audience))
    .flatMap(([url, options]) => {
      expect(String(url)).toBe(audience + "/gcp/v1/traces");
      expect(options?.method).toBe("POST");
      expect(new Headers(options?.headers).get("authorization")).toBe(
        "Bearer " + id,
      );
      const body = String(options?.body);
      expect(body).not.toContain(id);
      const groups = JSON.parse(body).resourceSpans;
      const attrs = groups[0].resource.attributes;
      expect(attrs).toContainEqual({
        key: "service.name",
        value: { stringValue: "quantile.co" },
      });
      expect(attrs).toContainEqual({
        key: "service.namespace",
        value: { stringValue: "quantile-q1" },
      });
      const metadata = attrs.find(
        (a: { key: string }) => a.key === "quantile.metadata",
      );
      const [entry] = JSON.parse(metadata.value.stringValue);
      expect(Object.values(entry)[0]).toMatchObject({
        K_SERVICE: "application",
        K_REVISION: "application-fixture",
      });
      return groups.flatMap(
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
