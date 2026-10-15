import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { readCheckoutSettings, runtimeEnvironment } from "@/lib/env/env";

export const runtime = "nodejs";

// Stripe returns its own hosted domain in some modes; accept both its
// Checkout origin and our active custom domain for provider-issued URLs.
const hostedCheckoutOrigins = new Set([
  "https://checkout.stripe.com",
  "https://billing.quantile.co",
]);

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
    const operationId = `${settings.appInstance}-${randomUUID().replaceAll("-", "")}`;
    const metadata = {
      quantile_app_instance: settings.appInstance,
      quantile_operation_id: operationId,
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        // Stripe selects eligible methods enabled in the Dashboard.
        line_items: [
          {
            price: settings.priceId,
            quantity: 1,
            adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 },
          },
        ],
        subscription_data: { metadata },
        metadata,
        success_url: `${settings.origin}/welcome`,
        cancel_url: `${settings.origin}/#pricing`,
      },
      { idempotencyKey: `checkout/${operationId}` },
    );
    if (
      !session.url ||
      session.livemode !== settings.livemode ||
      !hostedCheckoutOrigins.has(new URL(session.url).origin)
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
