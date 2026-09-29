import Stripe from "stripe";

export type WebhookConfig = {
  signingSecret: string;
  mode: "test" | "live";
};

export type EventHandlers = Partial<
  Record<Stripe.Event.Type, (event: Stripe.Event) => Promise<Response>>
>;

export const webhookResponse = (status: number, result: string) =>
  Response.json(
    { result },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export function readWebhookConfig(
  env: Record<string, string | undefined>,
): WebhookConfig {
  const mode = env.WELCOME_MODE;
  const signingSecret = env.STRIPE_WEBHOOK_SECRET;
  if (
    (mode !== "test" && mode !== "live") ||
    !signingSecret?.startsWith("whsec_")
  ) {
    throw new Error("Invalid Stripe webhook configuration.");
  }
  return { mode, signingSecret };
}

export function createStripeWebhook({
  config,
  handlers,
  report = () => {},
}: {
  config: WebhookConfig;
  handlers: EventHandlers;
  report?: (reason: string, eventId: string) => void;
}) {
  return async (request: Request): Promise<Response> => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return webhookResponse(400, "Invalid signature");
    // Verify the unchanged bytes, with a bounded request body.
    const reader = request.body?.getReader();
    if (!reader) return webhookResponse(400, "Missing body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024 * 1024) {
          await reader.cancel();
          return webhookResponse(413, "Request too large");
        }
        chunks.push(value);
      }
    } catch {
      return webhookResponse(400, "Invalid body");
    }
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(
        Buffer.concat(chunks),
        signature,
        config.signingSecret,
      );
    } catch {
      return webhookResponse(400, "Invalid signature");
    }
    if (event.livemode !== (config.mode === "live") || event.account) {
      return webhookResponse(400, "Wrong Stripe environment");
    }
    const handle = handlers[event.type];
    if (!handle) return webhookResponse(200, "Ignored");
    try {
      return await handle(event);
    } catch {
      // Do not log customer payloads, secrets or provider response bodies.
      report("stripe_event_handler_failed", event.id);
      return webhookResponse(503, "Retry required");
    }
  };
}
