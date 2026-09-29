import type Stripe from "stripe";
import { webhookResponse } from "../../webhook";

export function createInvoicePaymentSucceededHandler({
  welcomeEmail,
}: {
  welcomeEmail: (
    event: Stripe.InvoicePaymentSucceededEvent,
  ) => Promise<Response>;
}) {
  return async (event: Stripe.Event): Promise<Response> => {
    if (event.type !== "invoice.payment_succeeded") {
      return webhookResponse(200, "Ignored");
    }
    // Each action owns its eligibility rules. Initial-invoice-only filtering
    // belongs to welcome-email, not to this event's other/future actions.
    return welcomeEmail(event);
  };
}
