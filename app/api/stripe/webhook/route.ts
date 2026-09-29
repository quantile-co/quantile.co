import "server-only";
import { createInvoicePaymentSucceededHandler } from "./_lib/events/invoice.payment_succeeded/handler";
import {
  createWelcomeEmailHandler,
  readWelcomeConfig,
} from "./_lib/events/invoice.payment_succeeded/welcome-email/handler";
import { createWelcomeExecution } from "./_lib/events/invoice.payment_succeeded/welcome-email/workflow";
import {
  createStripeWebhook,
  readWebhookConfig,
  webhookResponse,
} from "./_lib/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const report = (reason: string, eventId: string) =>
    console.error(reason, { eventId });
  try {
    // One endpoint, with explicit event handlers. Read configuration only at
    // request time; initialize event-specific dependencies only after verification.
    return await createStripeWebhook({
      config: readWebhookConfig(process.env),
      report,
      handlers: {
        "invoice.payment_succeeded": createInvoicePaymentSucceededHandler({
          welcomeEmail: (event) =>
            createWelcomeEmailHandler({
              config: readWelcomeConfig(process.env),
              report,
              createExecution: (job) =>
                createWelcomeExecution(job, process.env),
            })(event),
        }),
      },
    })(request);
  } catch {
    console.error("stripe_webhook_unavailable");
    return webhookResponse(503, "Webhook unavailable");
  }
}
