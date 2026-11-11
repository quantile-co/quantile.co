import {
  context,
  createContextKey,
  createTraceState,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import type { ReadableSpan, TracerProvider } from "@opentelemetry/sdk-trace";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { register } from "./instrumentation";

const transport = vi.hoisted(() => ({
  spans: [] as ReadableSpan[],
  constructor: vi.fn(),
  shutdown: vi.fn(),
}));
vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: class {
    constructor(options: unknown) {
      transport.constructor(options);
    }
    export(spans: ReadableSpan[], done: (result: { code: number }) => void) {
      transport.spans.push(...spans);
      done({ code: 0 });
    }
    async shutdown() {
      transport.shutdown();
    }
  },
}));

const endpoint = "https://ingest.example.test";
const key = "test-ingestion-key";
const failure = "ClickStack tracing initialization failed";
let registration: MockInstance<typeof trace.setGlobalTracerProvider>;

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", undefined);
  vi.stubEnv("CLICKSTACK_API_KEY", undefined);
  registration = vi.spyOn(trace, "setGlobalTracerProvider");
  transport.spans.length = 0;
});
afterEach(async () => {
  for (const [provider] of registration.mock.calls)
    await (provider as TracerProvider).shutdown();
  trace.disable();
  context.disable();
  delete (globalThis as { __quantileClickStack?: Promise<void> })
    .__quantileClickStack;
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

function configure(base = endpoint) {
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", base);
  vi.stubEnv("CLICKSTACK_API_KEY", key);
}

async function flush() {
  await (registration.mock.calls[0][0] as TracerProvider).forceFlush();
}

describe("runtime ClickStack configuration", () => {
  it("does not create an exporter or register a provider when both values are absent", async () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://unrelated.example.test");
    await register();
    expect(transport.constructor).not.toHaveBeenCalled();
    expect(registration).not.toHaveBeenCalled();
  });

  it.each(["edge", undefined])(
    "does not initialize outside Node (%s)",
    async (runtime) => {
      configure();
      vi.stubEnv("NEXT_RUNTIME", runtime);
      await register();
      expect(transport.constructor).not.toHaveBeenCalled();
      expect(registration).not.toHaveBeenCalled();
    },
  );

  it.each([
    [undefined, key],
    [endpoint, undefined],
    ["", ""],
    [endpoint, ""],
    [endpoint, "Bearer test-key"],
    [endpoint, "key\r\ninjected: header"],
    [endpoint, "key\u007f"],
    [endpoint, "clé"],
    ["not-a-url", key],
    ["http://ingest.example.test", key],
    ["https:ingest.example.test", key],
    ["https://user:password@ingest.example.test", key],
    [`${endpoint}?secret=value`, key],
    [`${endpoint}#secret`, key],
    [`${endpoint}?`, key],
    [`${endpoint}#`, key],
    [`${endpoint}/v1/traces/`, key],
    [`${endpoint}/v1/logs`, key],
    [`${endpoint}/v1/metrics`, key],
    [` ${endpoint}`, key],
    [`${endpoint}\n`, key],
    [`${endpoint}\\path`, key],
  ])(
    "rejects invalid/partial pair %# without echoing values",
    async (base, ingestionKey) => {
      vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", base);
      vi.stubEnv("CLICKSTACK_API_KEY", ingestionKey);
      const error = await register().catch((error: Error) => error);
      expect(error).toEqual(new Error(failure));
      expect(error).not.toHaveProperty("cause");
      expect(transport.constructor).not.toHaveBeenCalled();
      expect(registration).not.toHaveBeenCalled();
    },
  );

  it.each([endpoint, `${endpoint}/`, `${endpoint}/otlp/`])(
    "appends the trace path to base URL %s",
    async (base) => {
      configure(base);
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "https://unrelated.example.test",
      );
      await register();
      expect(transport.constructor).toHaveBeenCalledExactlyOnceWith({
        url: `${base.replace(/\/$/, "")}/v1/traces`,
        headers: { authorization: `Bearer ${key}` },
        timeoutMillis: 10_000,
      });
    },
  );

  it("registers once across concurrent calls and module reloads", async () => {
    configure();
    await Promise.all([register(), register()]);
    vi.resetModules();
    await (await import("./instrumentation")).register();
    expect(transport.constructor).toHaveBeenCalledTimes(1);
    expect(registration).toHaveBeenCalledTimes(1);
  });

  it("fails closed without replacing an existing global provider", async () => {
    const { TracerProvider } = await import("@opentelemetry/sdk-trace");
    const existing = new TracerProvider();
    trace.setGlobalTracerProvider(existing);
    const tracer = trace.getTracer("existing");
    configure();
    await expect(register()).rejects.toThrow(failure);
    expect(trace.getTracer("existing")).toBe(tracer);
    expect(transport.shutdown).toHaveBeenCalledTimes(1);
  });

  it("preserves an existing global context manager", async () => {
    const { AsyncLocalStorageContextManager } = await import(
      "@opentelemetry/context-async-hooks"
    );
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
    const marker = createContextKey("existing-context");
    configure();
    await context.with(context.active().setValue(marker, true), async () => {
      await expect(register()).rejects.toThrow(failure);
      expect(context.active().getValue(marker)).toBe(true);
    });
    expect(registration).not.toHaveBeenCalled();
    expect(transport.shutdown).toHaveBeenCalledTimes(1);
  });

  it("sanitizes SDK/exporter initialization errors", async () => {
    configure();
    transport.constructor.mockImplementationOnce(() => {
      throw new Error(`${endpoint} ${key}`);
    });
    const error = await register().catch((error: Error) => error);
    expect(error).toEqual(new Error(failure));
    expect(error).not.toHaveProperty("cause");
    expect(registration).not.toHaveBeenCalled();
  });
});

it("exports only allowlisted request metadata, even when Next supplies sensitive data", async () => {
  configure();
  vi.stubEnv(
    "OTEL_RESOURCE_ATTRIBUTES",
    "secret=resource-secret,service.name=other",
  );
  vi.stubEnv("OTEL_SERVICE_NAME", "other");
  await register();
  const tracer = trace
    .getTracerProvider()
    .getTracer("sensitive-scope", "secret-version", {
      schemaUrl: "https://secret.test",
    });
  const span = tracer.startSpan("GET /private?token=secret", {
    kind: SpanKind.SERVER,
    attributes: {
      "next.span_type": "BaseServer.handleRequest",
      "http.method": "GET",
      "http.target": "/brand?secret=query",
      "http.url": "https://user:password@private.test/?secret=query",
      "http.request.header.cookie": "secret=cookie",
      "http.request.header.authorization": "Bearer secret",
      "http.request.body": "secret body",
      "next.span_name": "GET /brand?secret=query",
    },
    links: [
      {
        context: {
          traceId: "1".repeat(32),
          spanId: "2".repeat(16),
          traceFlags: 1,
          traceState: createTraceState("secret=value"),
        },
        attributes: { secret: "link" },
      },
    ],
  });
  span.setAttribute("http.route", "/brand");
  span.setAttribute("http.status_code", 503);
  span.setStatus({ code: SpanStatusCode.ERROR, message: "secret status" });
  span.recordException(new Error("secret exception"));
  span.addEvent("secret event", { secret: "event" });
  span.updateName("secret renamed span");
  span.end();
  await flush();

  expect(transport.spans).toHaveLength(1);
  const exported = transport.spans[0];
  expect(exported.name).toBe("HTTP request");
  expect(exported.attributes).toEqual({
    "http.method": "GET",
    "http.route": "/brand",
    "http.status_code": 503,
  });
  expect(exported.status).toEqual({ code: SpanStatusCode.ERROR });
  expect(exported.resource.attributes).toEqual({
    "service.name": "quantile.co-web",
  });
  expect(exported.events).toEqual([]);
  expect(exported.links).toEqual([]);
  expect(exported.parentSpanContext).toBeUndefined();
  expect(exported.spanContext().traceState).toBeUndefined();
  expect(JSON.stringify(exported)).not.toMatch(
    /secret|private|password|cookie|authorization/,
  );
});

it("drops fetch/internal spans and unrecognized route/method/status dimensions", async () => {
  configure();
  await register();
  const tracer = trace.getTracer("next");
  for (const type of ["AppRender.fetch", "AppRender.getBodyResult", "unknown"])
    tracer
      .startSpan("fetch https://private.test/?token=secret", {
        attributes: { "next.span_type": type },
      })
      .end();
  const request = tracer.startSpan("GET /secret-path", {
    kind: SpanKind.SERVER,
    attributes: {
      "next.span_type": "BaseServer.handleRequest",
      "http.method": "SECRET",
      "http.status_code": 999,
      "http.route": "/secret-path",
    },
  });
  request.end();
  await flush();
  expect(transport.spans).toHaveLength(1);
  expect(transport.spans[0].attributes).toEqual({});
});
