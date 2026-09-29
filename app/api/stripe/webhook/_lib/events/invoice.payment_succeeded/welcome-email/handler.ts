import type Stripe from "stripe";
import {
  readWebhookConfig,
  type WebhookConfig,
  webhookResponse,
} from "../../../webhook";
import { renderWelcomeEmail } from "./render";
import type { Mail, WelcomeJob } from "./workflow";

export type WelcomeConfig = WebhookConfig & {
  priceId: string;
  from: string;
  replyTo: string;
  testRecipient?: string;
  testScope?: string;
  testTarget: string;
};

export function readWelcomeConfig(
  env: Record<string, string | undefined>,
): WelcomeConfig {
  const webhook = readWebhookConfig(env);
  const required = (key: string) => {
    const value = env[key];
    if (!value) throw new Error(`Missing ${key}`);
    return value;
  };
  const testRecipient = env.WELCOME_TEST_RECIPIENT;
  const testScope = env.WELCOME_TEST_SCOPE;
  if (webhook.mode === "test") {
    if (
      !/^(?:(?:delivered|bounced|complained)(?:\+[a-zA-Z0-9_-]+)?|suppressed)@resend\.dev$/.test(
        testRecipient ?? "",
      )
    ) {
      throw new Error(
        "Test mode requires a Resend simulated delivery address.",
      );
    }
    if (!/^pr-[1-9][0-9]*$/.test(testScope ?? "")) {
      throw new Error("Test mode requires a PR namespace.");
    }
  }
  const priceId = required("STRIPE_CAPACITY_PRICE_ID");
  if (!priceId.startsWith("price_")) throw new Error("Invalid Stripe price.");
  return {
    ...webhook,
    priceId,
    from: required("WELCOME_FROM"),
    replyTo: required("WELCOME_REPLY_TO"),
    testRecipient,
    testScope,
    testTarget: env.WELCOME_TEST_TARGET || "preview",
  };
}

export function createWelcomeEmailHandler({
  config,
  createExecution,
  report = () => {},
}: {
  config: WelcomeConfig;
  createExecution: (job: WelcomeJob) => Promise<string>;
  report?: (reason: string, eventId: string) => void;
}) {
  return async (
    event: Stripe.InvoicePaymentSucceededEvent,
  ): Promise<Response> => {
    const invoice = event.data.object;
    const metadata = invoice.parent?.subscription_details?.metadata;
    const testRun = metadata?.quantile_test_run;
    // PR namespace isolates resources; target prevents the deployed webhook from
    // competing with local code. A unique run ID isolates local and CI test data.
    if (
      config.mode === "test" &&
      (metadata?.quantile_test_scope !== config.testScope ||
        metadata?.quantile_test_target !== config.testTarget)
    ) {
      return webhookResponse(200, "Ignored");
    }
    // Payment success, not checkout completion, also covers delayed methods.
    // Renewals/upgrades do not send another welcome.
    if (
      invoice.billing_reason !== "subscription_create" ||
      invoice.status !== "paid" ||
      !(invoice.amount_paid > 0)
    ) {
      return webhookResponse(200, "Ignored");
    }
    const lines = invoice.lines?.data;
    if (!Array.isArray(lines) || invoice.lines.has_more) {
      report("invalid_welcome_invoice", event.id);
      return webhookResponse(400, "Incomplete invoice lines");
    }
    const matching = lines.filter(
      (line) => line.pricing?.price_details?.price === config.priceId,
    );
    if (!matching.length) return webhookResponse(200, "Ignored");
    const quantity = matching[0].quantity;
    const subscription = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof subscription === "string" ? subscription : subscription?.id;
    const customerEmail = invoice.customer_email;
    if (
      matching.length !== 1 ||
      !Number.isInteger(quantity) ||
      quantity === null ||
      quantity < 1 ||
      quantity > 5 ||
      invoice.currency !== "usd" ||
      !/^sub_[A-Za-z0-9_]+$/.test(subscriptionId ?? "") ||
      !customerEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
      report("invalid_welcome_invoice", event.id);
      return webhookResponse(400, "Invalid subscription invoice");
    }
    let recipient = customerEmail;
    if (config.mode === "test") {
      const delivery = metadata?.quantile_test_delivery ?? "delivered";
      if (
        !/^[a-f0-9]{32}$/.test(testRun ?? "") ||
        !["delivered", "bounced", "complained", "suppressed"].includes(delivery)
      ) {
        return webhookResponse(400, "Invalid test run");
      }
      recipient =
        delivery === "suppressed"
          ? "suppressed@resend.dev"
          : `${delivery}+${config.testScope}-${testRun}@resend.dev`;
    }
    try {
      const email = await renderWelcomeEmail(quantity);
      const mail: Mail = {
        ...email,
        from: config.from,
        reply_to: config.replyTo,
        to: [recipient],
        subject:
          config.mode === "test" ? `[Test] ${email.subject}` : email.subject,
      };
      const execution = await createExecution({
        eventId: event.id,
        subscriptionId: subscriptionId as string,
        mode: config.mode,
        idempotencyKey: `welcome/${config.mode}/${subscriptionId}`,
        mail,
        ...(config.mode === "test"
          ? {
              testScope: config.testScope,
              testRun,
              testTarget: config.testTarget,
            }
          : {}),
      });
      return Response.json(
        { result: "accepted", execution },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    } catch {
      report("welcome_workflow_start_failed", event.id);
      return webhookResponse(503, "Retry required");
    }
  };
}
