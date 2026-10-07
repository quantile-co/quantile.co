import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { appInstanceSchema } from "@/lib/env/env";
import { type FirestoreConfig, getFirestore } from "@/lib/gcp/firestore";
import {
  assertEligibleTestPrice,
  assertTestOwnership,
  createTestOperation,
  readIntegrationTarget,
} from "@/lib/stripe/test";
import { createWelcomeStore } from "@/lib/welcome/store";

const inputs = z.object({
  STRIPE_EVENT_LIVEMODE: z.literal("false"),
  STRIPE_TEST_API_KEY: z.string().regex(/^(rk|sk)_test_/),
  STRIPE_PRICE_ID: z.string().regex(/^price_[A-Za-z0-9_]+$/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  RESEND_MANAGEMENT_API_KEY: z.string().startsWith("re_"),
  GCP_PROJECT_ID: z.string().min(1),
  QUANTILE_APP_INSTANCE: appInstanceSchema,
  QUANTILE_STRIPE_WEBHOOK_URL: z.string().min(1),
});
async function until<T>(
  check: () => Promise<T | undefined>,
  description: string,
  timeout = 120_000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await check();
    if (value !== undefined) return value;
    await delay(1500);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

// Same real-provider suite for launcher-owned localhost or a caller-owned test
// target. Never register dashboard Stripe endpoints: the local launcher uses CLI.
describe("provider-backed welcome completion", () => {
  it.each([
    "delivered",
    "bounced",
  ] as const)("completes checkout, callback and replay (%s simulator)", async (delivery) => {
    const parsed = inputs.safeParse(process.env);
    if (!parsed.success)
      throw new Error(
        `Invalid integration inputs: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}. See AGENTS.md for the Engram development guide.`,
      );
    const env = parsed.data;
    const appInstance = env.QUANTILE_APP_INSTANCE;
    const operation = createTestOperation(appInstance, delivery);
    const stripe = new Stripe(env.STRIPE_TEST_API_KEY, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
    const database: FirestoreConfig = {
      projectId: env.GCP_PROJECT_ID,
      emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || undefined,
    };
    const store = createWelcomeStore(getFirestore(database));
    const endpoint = readIntegrationTarget(env.QUANTILE_STRIPE_WEBHOOK_URL);
    const resendKey = env.RESEND_MANAGEMENT_API_KEY;
    const signingSecret = env.STRIPE_WEBHOOK_SECRET;
    let customer: Stripe.Customer | undefined;
    let session: Stripe.Checkout.Session | undefined;
    let stage = "price validation";
    const failures: Error[] = [];
    console.info(`Integration test operation: ${operation.id}`);
    try {
      const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID);
      assertEligibleTestPrice(price);
      stage = "test checkout creation";
      customer = await stripe.customers.create(
        { email: operation.recipient, metadata: operation.metadata },
        { idempotencyKey: `${operation.id}/customer` },
      );
      session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customer.id,
          payment_method_types: ["card"],
          line_items: [{ price: price.id, quantity: 1 }],
          subscription_data: { metadata: operation.metadata },
          metadata: operation.metadata,
          success_url: "https://example.com/checkout-complete",
          cancel_url: "https://example.com/checkout-canceled",
        },
        { idempotencyKey: `${operation.id}/checkout` },
      );
      if (
        !session.url ||
        session.livemode ||
        new URL(session.url).hostname !== "checkout.stripe.com"
      )
        throw new Error("Expected a test Checkout URL.");
      stage = "test checkout payment";
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(session.url);
        await page.locator("#cardNumber").fill("4242424242424242");
        await page
          .locator("#cardExpiry")
          .fill(`12${String(new Date().getUTCFullYear() + 3).slice(-2)}`);
        await page.locator("#cardCvc").fill("123");
        await page.locator("#billingName").fill("Quantile automated test");
        if (await page.locator("#billingCountry").isVisible())
          await page.locator("#billingCountry").selectOption("US");
        if (await page.locator("#billingPostalCode").isVisible())
          await page.locator("#billingPostalCode").fill("10001");
        // Checkout may preselect optional one-click saving, which requires a
        // phone even when the Session does not collect one. Keep this test
        // email-only and avoid enrolling its disposable customer.
        const saveForLater = page.locator("#enableStripePass");
        if (await saveForLater.isVisible()) await saveForLater.uncheck();
        await page.getByRole("button", { name: /Subscribe|Pay/i }).click();
        const id = session.id;
        session = await until(async () => {
          const current = await stripe.checkout.sessions.retrieve(id);
          return current.status === "complete" ? current : undefined;
        }, "Checkout payment");
      } finally {
        await browser.close();
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) throw new Error("Missing subscription.");
      assertTestOwnership(
        await stripe.subscriptions.retrieve(subscriptionId),
        operation,
      );
      stage = "Stripe delivery, Resend acceptance and verified Resend callback";
      const completed = await until(async () => {
        const record = await store.get({ mode: "test", subscriptionId });
        if (!record) return undefined;
        expect(record).toMatchObject({
          mode: "test",
          appInstance,
          testId: operation.id,
          subscriptionId,
        });
        return record.state === "accepted" && record.callbackReceivedAt
          ? record
          : undefined;
      }, stage);
      expect(JSON.parse(completed.request).to).toEqual([operation.recipient]);
      expect(completed.idempotencyKey).toBe(`welcome/test/${subscriptionId}`);
      stage = "Resend inspection";
      const resendId = completed.resendId;
      if (!resendId) throw new Error("Missing durable acceptance receipt.");
      const response = await fetch(
        `https://api.resend.com/emails/${encodeURIComponent(resendId)}`,
        {
          headers: { Authorization: `Bearer ${resendKey}` },
          signal: AbortSignal.timeout(20_000),
        },
      );
      expect(response.ok).toBe(true);
      expect((await response.json()).to).toEqual([operation.recipient]);
      stage = "owned duplicate replay";
      // Replay a REAL provider event using our test target's signing secret.
      // This tests duplicate processing, not Stripe's production retry schedule.
      const event = await stripe.events.retrieve(completed.eventId);
      expect(event.type).toBe("invoice.payment_succeeded");
      expect(event.livemode).toBe(false);
      if (event.type !== "invoice.payment_succeeded")
        throw new Error("Wrong event type.");
      expect(event.data.object.id).toBe(completed.invoiceId);
      expect(
        event.data.object.parent?.subscription_details?.metadata
          ?.quantile_test_id,
      ).toBe(operation.id);
      const body = JSON.stringify(event);
      const replay = await fetch(endpoint, {
        method: "POST",
        body,
        headers: {
          "stripe-signature": Stripe.webhooks.generateTestHeaderString({
            payload: body,
            secret: signingSecret,
          }),
        },
        signal: AbortSignal.timeout(20_000),
      });
      expect(replay.status).toBe(200);
      expect(await replay.json()).toMatchObject({
        result: "completed",
        resendId: completed.resendId,
      });
      expect(
        (await store.get({ mode: "test", subscriptionId }))?.resendId,
      ).toBe(completed.resendId);
    } catch {
      // SDK errors can include request credentials. Report safe correlation,
      // never raw provider exceptions, request options or webhook secrets.
      failures.push(
        new Error(
          `Integration failed during ${stage}, operation ${operation.id}. See AGENTS.md for the Engram development guide and safe investigation.`,
        ),
      );
    } finally {
      try {
        if (session) {
          const current = await stripe.checkout.sessions.retrieve(session.id);
          assertTestOwnership(current, operation);
          if (current.status === "open")
            await stripe.checkout.sessions.expire(current.id);
        }
      } catch {
        failures.push(
          new Error(
            `Could not clean Checkout for ${operation.id}; inspect this operation only.`,
          ),
        );
      }
      // Attempt both cleanups and preserve the original test failure. Never
      // let a cleanup exception replace it or expose raw SDK exceptions.
      if (customer) {
        try {
          const current = await stripe.customers.retrieve(customer.id);
          if (!current.deleted) {
            assertTestOwnership(current, operation);
            await stripe.customers.del(current.id);
          }
        } catch {
          failures.push(
            new Error(
              `Could not clean customer for ${operation.id}; inspect this operation only.`,
            ),
          );
        }
      }
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        `Integration operation ${operation.id} failed.`,
      );
  }, 420_000);
});
