import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore, pending, receipt } from "@/lib/welcome/test";

vi.mock("server-only", () => ({}));
const cloud = vi.hoisted(() => ({ store: vi.fn() }));
vi.mock("@/lib/welcome/store", () => ({ createWelcomeStore: cloud.store }));
const secret = `whsec_${Buffer.from("unit-test-signing-key-not-a-credential").toString("base64")}`;
function request(event: unknown = receipt(), age = 0, key = secret) {
  const payload = JSON.stringify(event);
  const date = new Date(Date.now() - age * 1000);
  const id = "msg_test";
  return new Request("http://localhost/api/resend/webhook", {
    method: "POST",
    body: payload,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(date.getTime() / 1000)),
      "svix-signature": new Webhook(key).sign(id, date, payload),
    },
  });
}
let store: ReturnType<typeof memoryStore>;
beforeEach(async () => {
  vi.resetModules();
  store = memoryStore();
  await store.prepare(pending());
  cloud.store.mockReset().mockReturnValue(store);
  vi.stubEnv("STRIPE_EVENT_LIVEMODE", "false");
  vi.stubEnv("GCP_PROJECT_ID", "demo-quantile");
  vi.stubEnv("QUANTILE_APP_INSTANCE", "sample");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("signed Resend receipt route", () => {
  it("does not require sending credentials or sender configuration", async () => {
    for (const key of [
      "RESEND_API_KEY",
      "RESEND_MANAGEMENT_API_KEY",
      "QUANTILE_EMAIL_FROM",
      "QUANTILE_EMAIL_REPLY_TO",
    ])
      vi.stubEnv(key, "");
    const { POST } = await import("./route");
    expect((await POST(request())).status).toBe(200);
  });
  it("rejects live billing with an emulator before opening persistence", async () => {
    vi.stubEnv("STRIPE_EVENT_LIVEMODE", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "localhost:8080");
    const { POST } = await import("./route");
    expect(
      (await POST(request(receipt(pending({ mode: "live" }))))).status,
    ).toBe(503);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "test",
    "live",
    "TRUE",
    "1",
  ])("fails closed with invalid STRIPE_EVENT_LIVEMODE=%s", async (value) => {
    vi.stubEnv("STRIPE_EVENT_LIVEMODE", value);
    const { POST } = await import("./route");
    expect((await POST(request())).status).toBe(503);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("verifies original bytes and records a callback completion", async () => {
    const { POST } = await import("./route");
    expect((await POST(request())).status).toBe(200);
    expect((await store.get(pending()))?.callbackReceivedAt).toBeTruthy();
    expect((await POST(request())).status).toBe(200);
  });
  it.each([600, -600])("rejects expired/future signatures %s", async (age) => {
    const { POST } = await import("./route");
    expect((await POST(request(receipt(), age))).status).toBe(400);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("rejects wrong signatures, missing headers and tampering", async () => {
    const { POST } = await import("./route");
    const signed = request();
    expect(
      (
        await POST(
          new Request(signed.url, {
            method: "POST",
            headers: signed.headers,
            body: `${await signed.text()} `,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await POST(new Request(signed.url, { method: "POST", body: "{}" })))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(
            receipt(),
            0,
            `whsec_${Buffer.from("another-key").toString("base64")}`,
          ),
        )
      ).status,
    ).toBe(400);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("bounds request size before opening Firestore", async () => {
    const { POST } = await import("./route");
    expect(
      (await POST(request({ huge: "x".repeat(1024 * 1024) }))).status,
    ).toBe(413);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("returns retryable failure when persistence fails", async () => {
    const { POST } = await import("./route");
    store.accept.mockRejectedValueOnce(new Error("private details"));
    expect((await POST(request())).status).toBe(503);
  });
  it("ignores unrelated events without cloud access", async () => {
    const { POST } = await import("./route");
    expect(
      await (await POST(request({ type: "email.delivered" }))).json(),
    ).toEqual({ result: "ignored" });
    expect(cloud.store).not.toHaveBeenCalled();
  });
});
