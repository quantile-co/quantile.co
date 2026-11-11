import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { PassThrough, Writable } from "node:stream";
import {
  context,
  createTraceState,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { expect, it, vi } from "vitest";
import { register } from "./instrumentation";

it.each(["path", "partial", "headers", "trace-headers", "existing-provider"])(
  "shared contract disables %s without replacing providers or leaking values",
  async (scenario) => {
    const previous = trace.getTracer("existing");
    if (scenario === "existing-provider")
      trace.setGlobalTracerProvider({ getTracer: () => previous });
    const registration = vi.spyOn(trace, "setGlobalTracerProvider");
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv(
      "CLICKSTACK_OTLP_ENDPOINT",
      scenario === "path"
        ? "https://ingest.example.test/private-path"
        : "https://ingest.example.test:4318",
    );
    vi.stubEnv(
      "CLICKSTACK_API_KEY",
      scenario === "partial" ? undefined : "synthetic-ingestion-key",
    );
    vi.stubEnv(
      "OTEL_EXPORTER_OTLP_HEADERS",
      scenario === "headers" ? "authorization=synthetic-other-key" : undefined,
    );
    vi.stubEnv(
      "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
      scenario === "trace-headers"
        ? "authorization=synthetic-other-key"
        : undefined,
    );
    try {
      await expect(register()).resolves.toBeUndefined();
      if (scenario === "existing-provider")
        expect(trace.getTracer("existing")).toBe(previous);
      else expect(registration).not.toHaveBeenCalled();
      expect(diagnostics).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(diagnostics.mock.calls)).not.toMatch(
        /synthetic|ingest.example|private-path/,
      );
    } finally {
      for (const [provider] of registration.mock.calls)
        await (
          provider as typeof provider & { shutdown(): Promise<void> }
        ).shutdown();
      trace.disable();
      context.disable();
      delete (globalThis as { __quantileTracingRegistration?: Promise<void> })
        .__quantileTracingRegistration;
      delete (globalThis as { __factoryOtelTracing?: unknown })
        .__factoryOtelTracing;
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    }
  },
);

it("sends safe OTLP/HTTP with managed Bearer auth through a fake local transport", async () => {
  const requests: { url: string; options: RequestOptions; body: string }[] = [];
  // Intercept the native transport, not the exporter/serializer. No socket opens.
  vi.spyOn(https, "request").mockImplementation(((
    url: URL,
    options: RequestOptions,
    respond: (response: IncomingMessage) => void,
  ) => {
    const chunks: Buffer[] = [];
    const request = Object.assign(
      new Writable({
        write(chunk, _encoding, done) {
          chunks.push(Buffer.from(chunk));
          done();
        },
        final(done) {
          requests.push({
            url: url.href,
            options,
            body: Buffer.concat(chunks).toString(),
          });
          const response = Object.assign(new PassThrough(), {
            statusCode: 200,
          });
          respond(response as unknown as IncomingMessage);
          response.end("{}");
          done();
        },
      }),
      { setTimeout: () => request },
    );
    return request as unknown as ClientRequest;
  }) as typeof https.request);
  syncBuiltinESMExports();
  const registration = vi.spyOn(trace, "setGlobalTracerProvider");
  const originalListeners = new Map(
    (["SIGINT", "SIGTERM", "beforeExit"] as const).map((event) => [
      event,
      process.listeners(event),
    ]),
  );
  const key = "synthetic-ingestion-key";
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("CLICKSTACK_OTLP_ENDPOINT", "https://ingest.example.test:4318");
  vi.stubEnv("CLICKSTACK_API_KEY", key);
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://unrelated.example.test");
  vi.stubEnv(
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "https://unrelated.example.test/traces",
  );
  vi.stubEnv("OTEL_EXPORTER_OTLP_HEADERS", undefined);
  vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_HEADERS", undefined);
  vi.stubEnv("OTEL_EXPORTER_OTLP_COMPRESSION", "none");
  vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_COMPRESSION", "none");
  try {
    await register();
    const tracer = trace.getTracer("secret-scope");
    const span = tracer.startSpan("GET /brand?secret=query", {
      kind: SpanKind.SERVER,
      attributes: {
        "next.span_type": "BaseServer.handleRequest",
        "http.method": "GET",
        "http.route": "/brand",
        "http.status_code": 200,
        "http.target": "/brand?secret=query",
        "http.request.header.cookie": "secret-cookie",
        "http.request.header.authorization": "secret-auth",
        "http.request.body": "secret-body",
      },
      links: [
        {
          context: {
            traceId: "1".repeat(32),
            spanId: "2".repeat(16),
            traceFlags: 1,
            traceState: createTraceState("secret=value"),
          },
        },
      ],
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: "secret-status" });
    span.recordException(new Error("secret-error"));
    span.addEvent("secret-event");
    span.end();
    tracer
      .startSpan("fetch https://private.test/?secret=query", {
        kind: SpanKind.CLIENT,
        attributes: { "next.span_type": "AppRender.fetch" },
      })
      .end();
    // Verify span-end export starts without a batch timer or forceFlush call.
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].url).toBe("https://ingest.example.test:4318/v1/traces");
    expect(requests[0].options.method).toBe("POST");
    expect(requests[0].options.headers).toMatchObject({
      authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    });
    expect(requests[0].options.headers).not.toHaveProperty("x-clickhouse-key");
    expect(requests[0].body).not.toMatch(
      /secret|synthetic|cookie|authorization|http.target/,
    );
    const payload = JSON.parse(requests[0].body);
    expect(payload.resourceSpans).toHaveLength(1);
    expect(payload.resourceSpans[0].resource.attributes).toEqual([
      { key: "service.name", value: { stringValue: "quantile.co-web" } },
    ]);
    const spans = payload.resourceSpans[0].scopeSpans[0].spans;
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("HTTP request");
    expect(spans[0].attributes).toEqual([
      { key: "http.method", value: { stringValue: "GET" } },
      { key: "http.status_code", value: { intValue: 200 } },
      { key: "http.route", value: { stringValue: "/brand" } },
    ]);
  } finally {
    for (const [provider] of registration.mock.calls)
      await (
        provider as typeof provider & { shutdown(): Promise<void> }
      ).shutdown();
    trace.disable();
    context.disable();
    for (const event of ["SIGINT", "SIGTERM", "beforeExit"] as const)
      for (const listener of process.listeners(event))
        if (!originalListeners.get(event)?.includes(listener))
          process.removeListener(event, listener);
    delete (globalThis as { __quantileTracingRegistration?: Promise<void> })
      .__quantileTracingRegistration;
    delete (globalThis as { __factoryOtelTracing?: unknown })
      .__factoryOtelTracing;
    vi.restoreAllMocks();
    syncBuiltinESMExports();
    vi.unstubAllEnvs();
  }
});
