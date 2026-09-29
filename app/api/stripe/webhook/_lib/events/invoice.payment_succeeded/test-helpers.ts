import Stripe from "stripe";
import type { WelcomeConfig } from "./welcome-email/handler";

export const config: WelcomeConfig = {
  signingSecret: "whsec_local_unit_test_only",
  mode: "test",
  priceId: "price_local_capacity",
  from: "Quantile <welcome@example.com>",
  replyTo: "help@example.com",
  testRecipient: "delivered+pr-1-00000000000000000000000000000001@resend.dev",
  testScope: "pr-1",
  testTarget: "preview",
};

export function paymentEvent(
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
              quantile_test_scope: config.testScope,
              quantile_test_run: "00000000000000000000000000000001",
              quantile_test_target: config.testTarget,
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

export function signedRequest(
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
