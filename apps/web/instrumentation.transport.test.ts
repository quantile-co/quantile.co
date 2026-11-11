import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { PassThrough, Writable } from "node:stream";
import { context, SpanKind, trace } from "@opentelemetry/api";
import type { TracerProvider } from "@opentelemetry/sdk-trace";
import { expect, it, vi } from "vitest";
import { register } from "./instrumentation";

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
  const key = "synthetic-ingestion-key";
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv(
    "CLICKSTACK_OTLP_ENDPOINT",
    "https://ingest.example.test:4318/otlp",
  );
  vi.stubEnv("CLICKSTACK_API_KEY", key);
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://unrelated.example.test");
  vi.stubEnv(
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "https://unrelated.example.test/traces",
  );
  vi.stubEnv("OTEL_EXPORTER_OTLP_HEADERS", "authorization=synthetic-wrong-key");
  vi.stubEnv(
    "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
    "authorization=synthetic-wrong-key",
  );
  vi.stubEnv("OTEL_EXPORTER_OTLP_COMPRESSION", "none");
  vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_COMPRESSION", "none");
  try {
    await register();
    const tracer = trace.getTracer("next.js");
    tracer
      .startSpan("GET /brand?secret=query", {
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
      })
      .end();
    // Verify span-end export starts without a batch timer or forceFlush call.
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].url).toBe(
      "https://ingest.example.test:4318/otlp/v1/traces",
    );
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
      await (provider as TracerProvider).shutdown();
    trace.disable();
    context.disable();
    delete (globalThis as { __quantileClickStack?: Promise<void> })
      .__quantileClickStack;
    vi.restoreAllMocks();
    syncBuiltinESMExports();
    vi.unstubAllEnvs();
  }
});
