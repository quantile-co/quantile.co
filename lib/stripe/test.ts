import { randomUUID } from "node:crypto";
import { parseAppInstance } from "../env/env.ts";

export function readIntegrationTarget(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid integration target.");
  }
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/api/stripe/webhook"
  )
    throw new Error(
      "Expected an HTTPS or loopback HTTP Stripe webhook target with no credentials/query/fragment.",
    );
  return url.href;
}

// A developer-owned Price need not have Q1's exact amount, but must still
// support the same paid monthly subscription flow as the selected catalog.
export function assertEligibleTestPrice(price: {
  active: boolean;
  livemode: boolean;
  currency: string;
  unit_amount: number | null;
  recurring: { interval: string; usage_type: string } | null;
}) {
  if (
    !price.active ||
    price.livemode ||
    price.currency !== "usd" ||
    price.unit_amount === null ||
    price.unit_amount <= 0 ||
    price.recurring?.interval !== "month" ||
    price.recurring.usage_type !== "licensed"
  )
    throw new Error(
      "Expected an active, positive USD monthly licensed test Price.",
    );
}

// This is an operation correlation/idempotency token, not another app instance.
export function createTestOperation(
  appInstance: string,
  delivery: "delivered" | "bounced",
) {
  const instance = parseAppInstance(appInstance);
  const id = `${instance}-${randomUUID().replaceAll("-", "")}`;
  return {
    id,
    recipient: `${delivery}+${id}@resend.dev`,
    metadata: {
      quantile_app_instance: instance,
      quantile_test_id: id,
      quantile_test_delivery: delivery,
    },
  };
}

export function assertTestOwnership(
  object: { livemode: boolean; metadata: Record<string, string> | null },
  operation: ReturnType<typeof createTestOperation>,
) {
  if (
    object.livemode ||
    object.metadata?.quantile_app_instance !==
      operation.metadata.quantile_app_instance ||
    object.metadata?.quantile_test_id !== operation.id
  ) {
    throw new Error(
      "Refusing to modify a live object or another test operation's resources.",
    );
  }
}
