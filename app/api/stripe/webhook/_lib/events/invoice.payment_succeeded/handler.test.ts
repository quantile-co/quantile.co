import { describe, expect, it, vi } from "vitest";
import { createStripeWebhook, webhookResponse } from "../../webhook";
import { createInvoicePaymentSucceededHandler } from "./handler";
import { config, paymentEvent, signedRequest } from "./test-helpers";

describe("invoice.payment_succeeded event handler", () => {
  it.each([
    "subscription_create",
    "subscription_cycle",
    "subscription_update",
  ])("delegates %s eligibility to the action rather than filtering the entire event", async (billingReason) => {
    const welcomeEmail = vi.fn(async () =>
      webhookResponse(200, "action result"),
    );
    const webhook = createStripeWebhook({
      config,
      handlers: {
        "invoice.payment_succeeded": createInvoicePaymentSucceededHandler({
          welcomeEmail,
        }),
      },
    });
    const response = await webhook(
      signedRequest(paymentEvent({ billing_reason: billingReason })),
    );
    expect(await response.json()).toEqual({ result: "action result" });
    expect(welcomeEmail).toHaveBeenCalledOnce();
    expect(welcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "invoice.payment_succeeded",
        data: {
          object: expect.objectContaining({ billing_reason: billingReason }),
        },
      }),
    );
  });

  it("rejects an unrelated event even if the handler is wired incorrectly", async () => {
    const welcomeEmail = vi.fn(async () => webhookResponse(200, "unexpected"));
    const webhook = createStripeWebhook({
      config,
      handlers: {
        "invoice.payment_failed": createInvoicePaymentSucceededHandler({
          welcomeEmail,
        }),
      },
    });
    const response = await webhook(
      signedRequest(paymentEvent({}, { type: "invoice.payment_failed" })),
    );
    expect(await response.json()).toEqual({ result: "Ignored" });
    expect(welcomeEmail).not.toHaveBeenCalled();
  });
});
