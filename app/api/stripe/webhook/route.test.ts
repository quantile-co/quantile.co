import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore } from "@/lib/welcome/test";

const config = {
  signingSecret: "whsec_local_unit_test_only",
  mode: "test" as const,
  priceId: "price_local_capacity",
  from: "Quantile <welcome@example.com>",
  replyTo: "help@example.com",
  appInstance: "sample",
};
const testId = "sample-00000000000000000000000000000001";
const recipient = `delivered+${testId}@resend.dev`;

function paymentEvent(
  invoiceOverrides: Record<string, unknown> = {},
  eventOverrides: Record<string, unknown> = {},
) {
  return {
    id: "evt_local_payment",
    object: "event",
    api_version: "2026-08-26.dahlia",
    type: "invoice.payment_succeeded",
    livemode: false,
    data: {
      object: {
        id: "in_local_first_payment",
        object: "invoice",
        billing_reason: "subscription_create",
        status: "paid",
        amount_paid: 499500,
        currency: "usd",
        customer_email: "customer@example.com",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: "sub_local_customer",
            metadata: {
              quantile_app_instance: config.appInstance,
              quantile_test_id: testId,
            },
          },
        },
        lines: {
          has_more: false,
          data: [
            {
              quantity: 1,
              pricing: {
                type: "price_details",
                price_details: { price: config.priceId },
              },
            },
          ],
        },
        ...invoiceOverrides,
      },
    },
    ...eventOverrides,
  };
}

function signedRequest(
  event: unknown = paymentEvent(),
  secret = config.signingSecret,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const body = JSON.stringify(event);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": Stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret,
        timestamp,
      }),
    },
  });
}

vi.mock("server-only", () => ({}));
const cloud = vi.hoisted(() => ({ store: vi.fn() }));
vi.mock("@/lib/welcome/store", () => ({
  createWelcomeStore: cloud.store,
}));
let store: ReturnType<typeof memoryStore>;
beforeEach(() => {
  vi.resetModules();
  store = memoryStore();
  cloud.store.mockReset().mockReturnValue(store);
  for (const [key, value] of Object.entries({
    STRIPE_EVENT_LIVEMODE: "false",
    STRIPE_WEBHOOK_SECRET: config.signingSecret,
    STRIPE_PRICE_ID: config.priceId,
    QUANTILE_EMAIL_FROM: config.from,
    QUANTILE_EMAIL_REPLY_TO: config.replyTo,
    QUANTILE_APP_INSTANCE: config.appInstance,
    GCP_PROJECT_ID: "demo-quantile",
    RESEND_API_KEY: "re_fixture",
  }))
    vi.stubEnv(key, value);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ id: "mail_accepted" })),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Next.js Stripe route", () => {
  it.each([
    "checkout.session.completed",
    "customer.subscription.created",
    "invoice.payment_failed",
    "invoice.paid",
  ])("ignores unrelated event %s without domain config", async (type) => {
    vi.stubEnv("QUANTILE_APP_INSTANCE", "");
    const { POST } = await import("./route");
    expect(
      await (await POST(signedRequest(paymentEvent({}, { type })))).json(),
    ).toEqual({ result: "Ignored" });
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: true },
    { account: "acct_connected" },
  ])("rejects wrong environment/account %o", async (event) => {
    const { POST } = await import("./route");
    expect((await POST(signedRequest(paymentEvent({}, event)))).status).toBe(
      400,
    );
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
    expect((await POST(signedRequest())).status).toBe(503);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("rejects missing, incorrect, expired and tampered signatures", async () => {
    const { POST } = await import("./route");
    const valid = signedRequest();
    for (const request of [
      new Request(valid.url, { method: "POST", body: "{}" }),
      signedRequest(paymentEvent(), "whsec_wrong"),
      signedRequest(
        paymentEvent(),
        config.signingSecret,
        Math.floor(Date.now() / 1000) - 600,
      ),
      new Request(valid.url, {
        method: "POST",
        headers: valid.headers,
        body: "{}",
      }),
    ]) {
      expect((await POST(request)).status).toBe(400);
    }
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies before opening persistence", async () => {
    const { POST } = await import("./route");
    const request = signedRequest();
    const response = await POST(
      new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: "x".repeat(1024 * 1024 + 1),
      }),
    );
    expect(response.status).toBe(413);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("rejects live billing with a local emulator at composition", async () => {
    vi.stubEnv("STRIPE_EVENT_LIVEMODE", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "localhost:8080");
    const { POST } = await import("./route");
    expect(
      (await POST(signedRequest(paymentEvent({}, { livemode: true })))).status,
    ).toBe(503);
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("ignores renewals without email configuration", async () => {
    for (const key of [
      "QUANTILE_EMAIL_FROM",
      "QUANTILE_EMAIL_REPLY_TO",
      "RESEND_API_KEY",
      "STRIPE_PRICE_ID",
    ])
      vi.stubEnv(key, "");
    const { POST } = await import("./route");
    expect(
      await (
        await POST(
          signedRequest(paymentEvent({ billing_reason: "subscription_cycle" })),
        )
      ).json(),
    ).toEqual({ result: "Ignored" });
    expect(cloud.store).not.toHaveBeenCalled();
  });
  it("replays accepted requests without today's sender configuration", async () => {
    const { POST } = await import("./route");
    expect((await POST(signedRequest())).status).toBe(200);
    for (const key of [
      "QUANTILE_EMAIL_FROM",
      "QUANTILE_EMAIL_REPLY_TO",
      "RESEND_API_KEY",
    ])
      vi.stubEnv(key, "");
    expect((await POST(signedRequest())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("verifies, renders, sends and durably confirms acceptance before acknowledging", async () => {
    const { POST, runtime } = await import("./route");
    expect(runtime).toBe("nodejs");
    const response = await POST(signedRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: "completed",
      subscriptionId: "sub_local_customer",
      resendId: "mail_accepted",
    });
    const record = [...store.records.values()][0];
    expect(JSON.parse(record.request).to).toEqual([recipient]);
    expect(JSON.parse(record.request).html).toContain("Welcome to Quantile");
    expect(record.state).toBe("accepted");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: record.request,
        headers: expect.objectContaining({
          "Idempotency-Key": record.idempotencyKey,
        }),
      }),
    );
    expect((await POST(signedRequest())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not initialize dependencies for unsigned or unowned requests", async () => {
    const { POST } = await import("./route");
    expect(
      (
        await POST(
          new Request("http://localhost/api/stripe/webhook", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(400);
    const event = paymentEvent();
    event.data.object.parent.subscription_details.metadata.quantile_test_id =
      "another-developer";
    expect(await (await POST(signedRequest(event))).json()).toEqual({
      result: "Ignored",
    });
    expect(cloud.store).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_EVENT_LIVEMODE",
    "QUANTILE_APP_INSTANCE",
    "STRIPE_PRICE_ID",
    "QUANTILE_EMAIL_FROM",
    "QUANTILE_EMAIL_REPLY_TO",
    "GCP_PROJECT_ID",
    "RESEND_API_KEY",
  ])("fails closed without %s", async (key) => {
    vi.stubEnv(key, "");
    const { POST } = await import("./route");
    expect((await POST(signedRequest())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not acknowledge a failed receipt write", async () => {
    const { POST } = await import("./route");
    store.accept.mockRejectedValueOnce(new Error("private database details"));
    const response = await POST(signedRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
  it("rejects unconfirmed provider responses", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}));
    expect((await POST(signedRequest())).status).toBe(503);
    expect(store.accept).not.toHaveBeenCalled();
  });
});

function setup(overrides: { mode?: "test" | "live" } = {}) {
  if (overrides.mode)
    vi.stubEnv(
      "STRIPE_EVENT_LIVEMODE",
      overrides.mode === "live" ? "true" : "false",
    );
  if (overrides.mode === "live") vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
  const send = vi.fn(async (_body: string, _key: string) => "mail_accepted");
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    const headers = new Headers(options?.headers);
    return Response.json({
      id: await send(
        String(options?.body),
        headers.get("Idempotency-Key") ?? "",
      ),
    });
  });
  return {
    store,
    send,
    report: vi.mocked(console.error),
    handler: async (request: Request) =>
      (await import("./route")).POST(request),
  };
}

describe("welcome email eligibility and completion", () => {
  it.each([
    1, 2, 3, 4, 5,
  ])("renders and durably completes %i issues", async (quantity) => {
    const { handler, send, store } = setup();
    const event = paymentEvent();
    event.data.object.lines.data[0].quantity = quantity;
    const response = await handler(signedRequest(event));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      result: "completed",
      resendId: "mail_accepted",
    });
    const record = [...store.records.values()][0];
    const mail = JSON.parse(record.request);
    expect(mail.to).toEqual([recipient]);
    expect(mail.subject).toBe("[Test] Welcome to Quantile");
    expect(mail.text.replace(/\s+/g, " ")).toContain(
      `${quantity} concurrent in-progress`,
    );
    expect(mail.reply_to).toBe(config.replyTo);
    expect(record).toMatchObject({
      state: "accepted",
      eventId: event.id,
      invoiceId: event.data.object.id,
      testId,
    });
    expect(send).toHaveBeenCalledWith(
      record.request,
      "welcome/test/sub_local_customer",
    );
  });
  it("only uses the customer address in explicit live mode", async () => {
    const { handler, store } = setup({ mode: "live" });
    expect(
      (await handler(signedRequest(paymentEvent({}, { livemode: true }))))
        .status,
    ).toBe(200);
    const record = [...store.records.values()][0];
    expect(JSON.parse(record.request).to).toEqual(["customer@example.com"]);
    expect(record.idempotencyKey).toBe("welcome/live/sub_local_customer");
  });
  it.each([
    { billing_reason: "subscription_cycle" },
    { billing_reason: "subscription_update" },
    { status: "open" },
    { amount_paid: 0 },
  ])("ignores ineligible invoices %o", async (invoice) => {
    const { handler, send } = setup();
    expect(
      await (await handler(signedRequest(paymentEvent(invoice)))).json(),
    ).toEqual({ result: "Ignored" });
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    `other-${"a".repeat(32)}`,
    `samplex-${"a".repeat(32)}`,
    undefined,
    "",
    "not-an-operation",
  ])("ignores unowned or malformed test operations %s", async (id) => {
    const { handler, store, send } = setup();
    const event = paymentEvent({
      parent: {
        subscription_details: {
          subscription: "sub_other",
          metadata: { quantile_test_id: id },
        },
      },
    });
    expect(await (await handler(signedRequest(event))).json()).toEqual({
      result: "Ignored",
    });
    expect(store.get).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("ignores another price", async () => {
    const { handler, send } = setup();
    const event = paymentEvent();
    event.data.object.lines.data[0].pricing.price_details.price = "price_other";
    expect((await handler(signedRequest(event))).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    { customer_email: null },
    { customer_email: "bad" },
    { currency: "eur" },
    { lines: null },
    { id: "invalid" },
  ])("rejects invalid eligible invoices %o", async (invoice) => {
    const { handler, send } = setup();
    expect((await handler(signedRequest(paymentEvent(invoice)))).status).toBe(
      400,
    );
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    0,
    6,
    1.5,
    null,
  ])("rejects invalid capacity %s", async (quantity) => {
    const { handler, send } = setup();
    const event = paymentEvent({
      lines: {
        has_more: false,
        data: [
          { quantity, pricing: { price_details: { price: config.priceId } } },
        ],
      },
    });
    expect((await handler(signedRequest(event))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects truncated lists and duplicate lines", async () => {
    const { handler } = setup();
    const event = paymentEvent();
    event.data.object.lines.has_more = true;
    expect((await handler(signedRequest(event))).status).toBe(400);
    event.data.object.lines.has_more = false;
    event.data.object.lines.data.push(event.data.object.lines.data[0]);
    expect((await handler(signedRequest(event))).status).toBe(400);
  });
  it("deduplicates distinct event IDs for one subscription", async () => {
    const { handler, send } = setup();
    await handler(signedRequest());
    await handler(signedRequest(paymentEvent({}, { id: "evt_another" })));
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("returns 503 after acceptance if receipt storage failed", async () => {
    const { handler, send, store, report } = setup();
    store.accept.mockRejectedValueOnce(new Error("private detail"));
    const response = await handler(signedRequest());
    expect(send).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(report).toHaveBeenCalledWith(
      "welcome_incomplete",
      expect.objectContaining({
        eventId: "evt_local_payment",
        subscriptionId: "sub_local_customer",
      }),
    );
  });
  it.each([
    "delivered",
    "bounced",
    "complained",
    "suppressed",
  ])("uses only the %s simulator", async (delivery) => {
    const { handler, store } = setup();
    const event = paymentEvent();
    Object.assign(event.data.object.parent.subscription_details.metadata, {
      quantile_test_delivery: delivery,
    });
    expect((await handler(signedRequest(event))).status).toBe(200);
    expect(JSON.parse([...store.records.values()][0].request).to).toEqual([
      delivery === "suppressed"
        ? "suppressed@resend.dev"
        : `${delivery}+${testId}@resend.dev`,
    ]);
  });
  it.each([
    "customer@example.com",
    "delivered@resend.dev.evil.test",
    "",
    "unknown",
  ])("rejects simulation %s", async (delivery) => {
    const { handler, send } = setup();
    const event = paymentEvent();
    Object.assign(event.data.object.parent.subscription_details.metadata, {
      quantile_test_delivery: delivery,
    });
    expect((await handler(signedRequest(event))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
