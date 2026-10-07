import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import Stripe from "stripe";
import { expect, it } from "vitest";
import { z } from "zod";
import { appInstanceSchema, belongsToAppInstance } from "@/lib/env/env";
import { getFirestore } from "@/lib/gcp/firestore";
import {
  assertTestOwnership,
  type createTestOperation,
} from "@/lib/stripe/test";
import { createWelcomeStore } from "@/lib/welcome/store";

async function cleanOwnedCheckout(
  stripe: Stripe,
  sessionId: string,
  operation: ReturnType<typeof createTestOperation> | undefined,
) {
  if (!operation) throw new Error("Unknown Checkout owner.");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  assertTestOwnership(session, operation);
  if (session.status === "open") {
    await stripe.checkout.sessions.expire(session.id);
  } else if (session.status === "complete") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    if (!subscriptionId || !customerId)
      throw new Error("Missing owned billing resources.");
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    assertTestOwnership(subscription, operation);
    const subscriberId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    if (subscriberId !== customerId)
      throw new Error("Checkout customer does not match subscription.");
    // Deleting this proven, test-owned customer cancels its subscription;
    // the Sandbox key need not have subscription mutation permissions.
    await stripe.customers.del(customerId);
    const canceled = await stripe.subscriptions.retrieve(subscriptionId);
    if (canceled.status !== "canceled")
      throw new Error("Checkout subscription was not canceled.");
  }
}

// This exercises the actual landing-page button only when the launcher owns the
// local app. --target tests exercise their caller-owned webhook, not Checkout.
it.skipIf(!process.env.QUANTILE_CHECKOUT_TEST_ORIGIN)(
  "completes landing-page Checkout, signed invoice and welcome callback",
  async () => {
    const parsed = z
      .object({
        QUANTILE_CHECKOUT_TEST_ORIGIN: z.string().url(),
        STRIPE_TEST_API_KEY: z.string().regex(/^(rk|sk)_test_/),
        STRIPE_PRICE_ID: z.string().regex(/^price_[A-Za-z0-9_]+$/),
        QUANTILE_APP_INSTANCE: appInstanceSchema,
        GCP_PROJECT_ID: z.string().min(1),
      })
      .safeParse(process.env);
    if (!parsed.success)
      throw new Error(
        `Invalid Checkout integration inputs: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
      );
    const env = parsed.data;
    const origin = env.QUANTILE_CHECKOUT_TEST_ORIGIN;
    const stripe = new Stripe(env.STRIPE_TEST_API_KEY, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
    const store = createWelcomeStore(
      getFirestore({
        projectId: env.GCP_PROJECT_ID,
        emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || undefined,
      }),
    );
    let sessionId: string | undefined;
    let operation: ReturnType<typeof createTestOperation> | undefined;
    let stage = "landing-page Checkout";
    const failures: Error[] = [];
    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const home = await page.goto(origin);
        expect(home?.ok()).toBe(true);
        stage = "rendered signup form";
        const form = page.locator("form#subscription-checkout");
        expect(await form.getAttribute("action")).toBe("/api/stripe/checkout");
        expect(await form.getAttribute("method")).toBe("post");
        stage = "same-origin Checkout POST";
        const started = page.waitForResponse(
          (response) =>
            response.url() === `${origin}/api/stripe/checkout` &&
            response.request().method() === "POST",
        );
        await page
          .getByRole("button", { name: "Start building" })
          .first()
          .click();
        const response = await started;
        expect(response.status()).toBe(303);
        const checkoutUrl = response.headers().location;
        if (
          !checkoutUrl ||
          new URL(checkoutUrl).origin !== "https://checkout.stripe.com"
        )
          throw new Error("Unexpected Checkout redirect.");
        const id = new URL(checkoutUrl).pathname.split("/").at(-1);
        if (!id || !/^cs_test_[A-Za-z0-9_]+$/.test(id))
          throw new Error("Missing test Checkout Session ID.");
        sessionId = id;
        stage = "Checkout Session ownership";
        const session = await stripe.checkout.sessions.retrieve(id);
        const testId = session.metadata?.quantile_test_id;
        if (
          session.livemode ||
          !belongsToAppInstance(env.QUANTILE_APP_INSTANCE, testId) ||
          session.metadata?.quantile_app_instance !==
            env.QUANTILE_APP_INSTANCE ||
          session.metadata?.quantile_test_delivery !== "delivered"
        )
          throw new Error("Checkout operation is not owned by this app.");
        operation = {
          id: testId,
          recipient: `delivered+${testId}@resend.dev`,
          metadata: {
            quantile_app_instance: env.QUANTILE_APP_INSTANCE,
            quantile_test_id: testId,
            quantile_test_delivery: "delivered",
          },
        };
        assertTestOwnership(session, operation);
        stage = "hosted Checkout redirect";
        await page.waitForURL(
          (url) => url.origin === "https://checkout.stripe.com",
        );
        stage = "hosted email input";
        await page.locator("#email").fill(operation.recipient);
        stage = "hosted card input";
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
        const saveForLater = page.locator("#enableStripePass");
        if (await saveForLater.isVisible()) await saveForLater.uncheck();
        stage = "hosted payment action";
        await page.getByRole("button", { name: /Subscribe|Pay/i }).click();
        const deadline = Date.now() + 120_000;
        let subscriptionId: string | undefined;
        while (Date.now() < deadline) {
          const current = await stripe.checkout.sessions.retrieve(id);
          if (current.status === "complete") {
            subscriptionId =
              typeof current.subscription === "string"
                ? current.subscription
                : current.subscription?.id;
            break;
          }
          await delay(1500);
        }
        if (!subscriptionId) throw new Error("Checkout did not complete.");
        assertTestOwnership(
          await stripe.subscriptions.retrieve(subscriptionId),
          operation,
        );
        stage = "signed invoice and Resend callback";
        const completionDeadline = Date.now() + 120_000;
        let completed = false;
        while (Date.now() < completionDeadline) {
          const record = await store.get({ mode: "test", subscriptionId });
          if (record?.state === "accepted" && record.callbackReceivedAt) {
            expect(record).toMatchObject({
              mode: "test",
              appInstance: env.QUANTILE_APP_INSTANCE,
              testId,
              subscriptionId,
            });
            expect(JSON.parse(record.request).to).toEqual([
              operation.recipient,
            ]);
            completed = true;
            break;
          }
          await delay(1500);
        }
        if (!completed) throw new Error("Welcome callback did not complete.");
      } finally {
        await browser.close();
      }
    } catch {
      // Never leak raw provider errors, customer details or API request bodies.
      failures.push(
        new Error(
          `Landing Checkout integration failed at ${stage}; operation ${operation?.id ?? "unverified"}.`,
        ),
      );
    } finally {
      if (sessionId) {
        try {
          await cleanOwnedCheckout(stripe, sessionId, operation);
        } catch {
          failures.push(
            new Error(
              `Could not verify and clean owned Checkout ${sessionId}; investigate only this operation.`,
            ),
          );
        }
      }
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        "Landing Checkout integration failed.",
      );
  },
  420_000,
);
