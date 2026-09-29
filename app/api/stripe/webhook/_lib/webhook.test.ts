import { describe, expect, it, vi } from "vitest";
import {
  config,
  paymentEvent,
  signedRequest,
} from "./events/invoice.payment_succeeded/test-helpers";
import {
  createStripeWebhook,
  readWebhookConfig,
  webhookResponse,
} from "./webhook";

function setup() {
  const handleEvent = vi.fn(async () => webhookResponse(200, "handled"));
  const handler = createStripeWebhook({
    config,
    handlers: { "invoice.payment_succeeded": handleEvent },
  });
  return { handler, handleEvent };
}

describe("shared webhook dispatcher", () => {
  it.each([
    "checkout.session.completed",
    "customer.subscription.created",
    "invoice.payment_failed",
    "invoice.paid",
  ])("ignores unregistered event type %s", async (type) => {
    const { handler, handleEvent } = setup();
    const response = await handler(signedRequest(paymentEvent({}, { type })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "Ignored" });
    expect(handleEvent).not.toHaveBeenCalled();
  });

  it.each([
    { livemode: true },
    { account: "acct_connected" },
  ])("rejects wrong environment/account: %o", async (event) => {
    const { handler, handleEvent } = setup();
    expect((await handler(signedRequest(paymentEvent({}, event)))).status).toBe(
      400,
    );
    expect(handleEvent).not.toHaveBeenCalled();
  });

  it("rejects missing, wrong, stale and tampered signatures", async () => {
    const { handler, handleEvent } = setup();
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
      expect((await handler(request)).status).toBe(400);
    }
    expect(handleEvent).not.toHaveBeenCalled();
  });

  it("rejects an oversized body", async () => {
    const { handler, handleEvent } = setup();
    const valid = signedRequest();
    const response = await handler(
      new Request(valid.url, {
        method: "POST",
        headers: valid.headers,
        body: "x".repeat(1024 * 1024 + 1),
      }),
    );
    expect(response.status).toBe(413);
    expect(handleEvent).not.toHaveBeenCalled();
  });

  it("dispatches by official event type without payment-specific logic", async () => {
    const invoice = vi.fn(async () => webhookResponse(200, "invoice handled"));
    const checkout = vi.fn(async () =>
      webhookResponse(200, "checkout handled"),
    );
    const handler = createStripeWebhook({
      config,
      handlers: {
        "invoice.payment_succeeded": invoice,
        "checkout.session.completed": checkout,
      },
    });
    expect(await (await handler(signedRequest())).json()).toEqual({
      result: "invoice handled",
    });
    expect(
      await (
        await handler(
          signedRequest(
            paymentEvent({}, { type: "checkout.session.completed" }),
          ),
        )
      ).json(),
    ).toEqual({ result: "checkout handled" });
    expect(invoice).toHaveBeenCalledTimes(1);
    expect(checkout).toHaveBeenCalledTimes(1);
  });
  it("acknowledges unhandled events without initializing another handler", async () => {
    const handler = createStripeWebhook({ config, handlers: {} });
    expect(await (await handler(signedRequest())).json()).toEqual({
      result: "Ignored",
    });
  });
  it("does not acknowledge a handler failure or log its private details", async () => {
    const report = vi.fn();
    const handler = createStripeWebhook({
      config,
      report,
      handlers: {
        "invoice.payment_succeeded": async () => {
          throw new Error("private value");
        },
      },
    });
    const response = await handler(signedRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(report).toHaveBeenCalledWith(
      "stripe_event_handler_failed",
      "evt_local_payment",
    );
  });
  it("needs only webhook configuration, not welcome configuration", () => {
    expect(
      readWebhookConfig({
        WELCOME_MODE: "test",
        STRIPE_WEBHOOK_SECRET: config.signingSecret,
      }),
    ).toEqual({ mode: "test", signingSecret: config.signingSecret });
    expect(() => readWebhookConfig({})).toThrow();
  });
});
