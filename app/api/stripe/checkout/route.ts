import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { readCheckoutSettings, runtimeEnvironment } from "@/lib/env/env";

export const runtime = "nodejs";

// A browser form posts here in every environment. GET cannot create billing
// resources; neither the key nor the selected Price is sent to the client.
export async function POST(request: Request) {
  try {
    const settings = readCheckoutSettings(runtimeEnvironment());
    if (request.headers.get("origin") !== settings.origin)
      return new Response("Forbidden", { status: 403 });

    const stripe = new Stripe(settings.key, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
    const price = await stripe.prices.retrieve(settings.priceId);
    if (
      !price.active ||
      price.livemode !== settings.livemode ||
      price.currency !== "usd" ||
      price.unit_amount === null ||
      price.unit_amount <= 0 ||
      price.recurring?.interval !== "month" ||
      price.recurring.usage_type !== "licensed" ||
      (settings.livemode && price.unit_amount !== 499_500)
    )
      throw new Error("Checkout Price is ineligible.");

    const operationId = `${settings.appInstance}-${randomUUID().replaceAll("-", "")}`;
    const metadata: Record<string, string> = {
      quantile_app_instance: settings.appInstance,
    };
    if (!settings.livemode) {
      metadata.quantile_test_id = operationId;
      metadata.quantile_test_delivery = "delivered";
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: settings.priceId,
            quantity: 1,
            adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 },
          },
        ],
        subscription_data: { metadata },
        metadata,
        success_url: `${settings.origin}/?checkout=success`,
        cancel_url: `${settings.origin}/#pricing`,
      },
      { idempotencyKey: `checkout/${operationId}` },
    );
    if (
      !session.url ||
      session.livemode !== settings.livemode ||
      new URL(session.url).origin !== "https://checkout.stripe.com"
    )
      throw new Error("Unexpected Checkout Session.");
    return new Response(null, {
      status: 303,
      headers: {
        Location: session.url,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    // Provider/Zod errors can contain customer data, URLs and credentials.
    console.error("checkout_unavailable");
    return new Response("Checkout unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
