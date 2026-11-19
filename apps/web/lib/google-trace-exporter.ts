import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import { OTLPHttpJsonTraceExporter } from "@vercel/otel";

const account =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default";

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Telemetry identity unavailable");
  return response;
}

async function mint(audience: string) {
  const headers = { "Metadata-Flavor": "Google" };
  const [email, access] = await Promise.all([
    request(account + "/email", { headers }).then((r) => r.text()),
    request(account + "/token", { headers }).then((r) => r.json()),
  ]);
  if (
    !/^[^@\s/]+@[\w.-]+\.gserviceaccount\.com$/.test(email) ||
    typeof access?.access_token !== "string" ||
    !access.access_token
  )
    throw new Error("Missing workload identity");
  const url =
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
    encodeURIComponent(email) +
    ":generateIdToken";
  const { token } = await (
    await request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${access.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audience,
        includeEmail: true,
        organizationNumberIncluded: true,
      }),
    })
  ).json();
  if (typeof token !== "string") throw new Error("Missing identity token");
  // The recipient verifies the signature. Decode exp here only to schedule renewal.
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  if (
    !Number.isSafeInteger(claims.exp) ||
    claims.exp * 1000 <= Date.now() + 60_000 ||
    claims.aud !== audience
  )
    throw new Error("Unusable identity token");
  return {
    until: claims.exp * 1000 - 60_000,
    exporter: new OTLPHttpJsonTraceExporter({
      url: audience + "/gcp/v1/traces",
      headers: { authorization: `Bearer ${token}` },
    }),
  };
}

// Refresh on demand (Cloud Run may suspend CPU between requests). Coalesce
// concurrent span exports and never fall back to an unauthenticated request.
export function googleTraceExporter(audience: string): SpanExporter {
  let cached: Awaited<ReturnType<typeof mint>> | undefined;
  let pending: ReturnType<typeof mint> | undefined;
  return {
    export(spans, callback) {
      if (cached && cached.until > Date.now())
        return cached.exporter.export(spans, callback);
      pending ??= mint(audience)
        .then((entry) => (cached = entry))
        .finally(() => {
          pending = undefined;
        });
      void pending.then(
        ({ exporter }) => exporter.export(spans, callback),
        () =>
          callback({
            code: 1,
            error: new Error("Telemetry identity unavailable"),
          }),
      );
    },
    async shutdown() {
      await cached?.exporter.shutdown();
    },
  };
}
