import "server-only";
import Stripe from "stripe";
import { z } from "zod";
import { appInstanceSchema, belongsToAppInstance } from "@/lib/app/instance";
import { getFirestore } from "@/lib/gcp/firestore";
import {
  createWelcomeDelivery,
  type WelcomeIdentity,
} from "@/lib/welcome/delivery";
import { renderWelcomeEmail } from "@/lib/welcome/render";
import { createEmailSender } from "@/lib/welcome/resend";
import { createWelcomeStore } from "@/lib/welcome/store";

export const runtime = "nodejs";
const reply = (status: number, result: string) =>
  Response.json(
    { result },
    { status, headers: { "Cache-Control": "no-store" } },
  );

async function body(request: Request): Promise<Buffer | Response> {
  const reader = request.body?.getReader();
  if (!reader) return reply(400, "Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        return reply(413, "Request too large");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return reply(400, "Invalid body");
  } finally {
    reader.releaseLock();
  }
}

// One supported event/use case: keep HTTP and Stripe-specific decisions here.
async function welcome(
  event: Stripe.InvoicePaymentSucceededEvent,
  mode: "test" | "live",
  env: NodeJS.ProcessEnv,
) {
  const invoice = event.data.object;
  if (
    invoice.billing_reason !== "subscription_create" ||
    invoice.status !== "paid" ||
    !(invoice.amount_paid > 0)
  )
    return reply(200, "Ignored");
  const appInstance = appInstanceSchema.parse(env.QUANTILE_APP_INSTANCE);
  const metadata = invoice.parent?.subscription_details?.metadata;
  const testId = metadata?.quantile_test_id;
  if (mode === "test" && !belongsToAppInstance(appInstance, testId))
    return reply(200, "Ignored");
  const priceId = z
    .string()
    .regex(/^price_[A-Za-z0-9_]+$/)
    .parse(env.STRIPE_PRICE_ID);
  const lines = invoice.lines?.data;
  if (!Array.isArray(lines) || invoice.lines.has_more)
    return reply(400, "Incomplete invoice lines");
  const matching = lines.filter(
    (line) => line.pricing?.price_details?.price === priceId,
  );
  if (!matching.length) return reply(200, "Ignored");
  const quantity = matching[0].quantity;
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscription === "string" ? subscription : subscription?.id;
  const candidate = z
    .object({
      quantity: z.number().int().min(1).max(5),
      currency: z.literal("usd"),
      subscriptionId: z.string().regex(/^sub_[A-Za-z0-9_]+$/),
      invoiceId: z.string().regex(/^in_[A-Za-z0-9_]+$/),
      email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    })
    .safeParse({
      quantity,
      currency: invoice.currency,
      subscriptionId,
      invoiceId: invoice.id,
      email: invoice.customer_email,
    });
  if (matching.length !== 1 || !candidate.success)
    return reply(400, "Invalid subscription invoice");
  let recipient = candidate.data.email;
  if (mode === "test") {
    const simulation = z
      .enum(["delivered", "bounced", "complained", "suppressed"])
      .safeParse(metadata?.quantile_test_delivery ?? "delivered");
    if (!simulation.success) return reply(400, "Invalid test operation");
    recipient =
      simulation.data === "suppressed"
        ? "suppressed@resend.dev"
        : `${simulation.data}+${testId}@resend.dev`;
  }
  const identity: WelcomeIdentity = {
    eventId: event.id,
    invoiceId: invoice.id,
    subscriptionId: candidate.data.subscriptionId,
    mode,
    appInstance,
    ...(mode === "test" ? { testId } : {}),
  };
  try {
    const emulatorHost = env.FIRESTORE_EMULATOR_HOST || undefined;
    if (mode === "live" && emulatorHost)
      throw new Error("Live billing cannot use an emulator.");
    const store = createWelcomeStore(
      getFirestore({
        projectId: z.string().min(1).parse(env.GCP_PROJECT_ID),
        emulatorHost,
      }),
    );
    const deliver = createWelcomeDelivery({
      store,
      send: (request, key) =>
        createEmailSender(z.string().min(1).parse(env.RESEND_API_KEY))(
          request,
          key,
        ),
    });
    const completed = await deliver(identity, async () => {
      // Existing immutable requests need neither today's sender config nor renderer.
      const from = z.string().min(1).parse(env.QUANTILE_EMAIL_FROM);
      const replyTo = z.string().min(1).parse(env.QUANTILE_EMAIL_REPLY_TO);
      const email = await renderWelcomeEmail(candidate.data.quantity);
      return {
        ...email,
        from,
        reply_to: replyTo,
        to: [recipient],
        subject: mode === "test" ? `[Test] ${email.subject}` : email.subject,
      };
    });
    console.info("welcome_completed", {
      ...identity,
      resendId: completed.resendId,
    });
    return Response.json(
      {
        result: "completed",
        subscriptionId: identity.subscriptionId,
        resendId: completed.resendId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("welcome_incomplete", {
      eventId: event.id,
      invoiceId: invoice.id,
      subscriptionId: identity.subscriptionId,
      appInstance,
      mode,
    });
    return reply(503, "Retry required");
  }
}

export async function POST(request: Request) {
  try {
    const env = process.env;
    const mode = z.enum(["test", "live"]).parse(env.STRIPE_MODE);
    const secret = z
      .string()
      .startsWith("whsec_")
      .parse(env.STRIPE_WEBHOOK_SECRET);
    const signature = request.headers.get("stripe-signature");
    if (!signature) return reply(400, "Invalid signature");
    const raw = await body(request);
    if (raw instanceof Response) return raw;
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(raw, signature, secret);
    } catch {
      return reply(400, "Invalid signature");
    }
    if (event.livemode !== (mode === "live") || event.account)
      return reply(400, "Wrong Stripe environment");
    if (event.type !== "invoice.payment_succeeded")
      return reply(200, "Ignored");
    return await welcome(event, mode, env);
  } catch {
    // Zod/provider errors may contain supplied values; never log raw exceptions.
    console.error("stripe_webhook_unavailable");
    return reply(503, "Webhook unavailable");
  }
}
