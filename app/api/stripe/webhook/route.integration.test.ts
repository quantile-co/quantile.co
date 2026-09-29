import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { GoogleAuth } from "google-auth-library";
import { chromium } from "playwright";
import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signedRequest } from "./_lib/events/invoice.payment_succeeded/test-helpers";
import {
  readWorkflowTarget,
  type WelcomeJob,
} from "./_lib/events/invoice.payment_succeeded/welcome-email/workflow";
import { assertTestOwnership, createTestRun } from "./_lib/test-helpers";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

function required(key: string) {
  const value = process.env[key];
  if (!value)
    throw new Error(
      `Connected tests require ${key}. See private deployment instructions.`,
    );
  return value;
}

async function until<T>(
  check: () => Promise<T | undefined>,
  description: string,
  timeout = 120_000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result !== undefined) return result;
    await delay(2_000);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

type Execution = {
  name: string;
  state: string;
  argument: string;
  result?: string;
  workflowRevisionId: string;
  labels?: Record<string, string>;
};
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
async function cloud<T>(url: string, data?: unknown): Promise<T> {
  try {
    return (
      await auth.request<T>({
        url,
        method: data ? "POST" : "GET",
        ...(data ? { data } : {}),
        timeout: 20_000,
        retry: false,
      })
    ).data;
  } catch {
    // Avoid printing credential-bearing HTTP client errors in test reports.
    throw new Error(
      "Connected test cloud request failed. Check ADC and preview IAM.",
    );
  }
}

// Not included in pnpm test/check. Both projects use REAL provider APIs and
// require the deployed resources of a private WIP/draft PR, never production.
describe("PR-scoped connected welcome delivery", () => {
  it.each([
    "delivered",
    "bounced",
  ] as const)("completes checkout and records Resend's %s simulation", async (delivery) => {
    if (required("WELCOME_MODE") !== "test")
      throw new Error("Connected tests cannot use live mode.");
    const apiKey = required("STRIPE_TEST_API_KEY");
    if (!/^(rk|sk)_test_/.test(apiKey))
      throw new Error("Connected tests require a Stripe test key.");
    const resendKey = required("RESEND_TEST_API_KEY");
    const local = required("INTEGRATION_TARGET") === "local";
    const target = local
      ? `local-${randomUUID().replaceAll("-", "")}`
      : "preview";
    const run = createTestRun(required("WELCOME_TEST_SCOPE"), target, delivery);
    const workflow = readWorkflowTarget(process.env);
    const revision = (
      await cloud<{ revisionId: string }>(
        `https://workflows.googleapis.com/v1/${workflow.name}`,
      )
    ).revisionId;
    const stripe = new Stripe(apiKey, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
    const price = await stripe.prices.retrieve(
      required("STRIPE_CAPACITY_PRICE_ID"),
    );
    expect(price.livemode).toBe(false);
    expect(price.currency).toBe("usd");
    expect(price.unit_amount).toBe(499500);
    expect(price.recurring?.interval).toBe("month");
    const signingSecret = `whsec_${randomUUID()}`;
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", signingSecret);
    vi.stubEnv("WELCOME_TEST_TARGET", target);
    const endpoint = local
      ? undefined
      : new URL(required("INTEGRATION_WEBHOOK_URL"));
    if (
      endpoint &&
      (endpoint.protocol !== "https:" ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash ||
        endpoint.pathname !== "/api/stripe/webhook")
    ) {
      throw new Error(
        "Expected an HTTPS preview webhook URL without credentials, query or fragment.",
      );
    }
    if (endpoint) {
      const registered = await stripe.webhookEndpoints.retrieve(
        required("STRIPE_TEST_WEBHOOK_ID"),
      );
      expect(registered.livemode).toBe(false);
      expect(registered.url).toBe(endpoint.toString());
      expect(registered.metadata.quantile_namespace).toBe(run.scope);
      expect(registered.enabled_events).toContain("invoice.payment_succeeded");
    }
    console.info(`Connected test ${run.scope}/${run.id} (${target})`);
    let customer: Stripe.Customer | undefined;
    let session: Stripe.Checkout.Session | undefined;
    try {
      customer = await stripe.customers.create(
        { email: run.recipient, metadata: run.metadata },
        { idempotencyKey: `${run.scope}/${run.id}/customer` },
      );
      session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customer.id,
          payment_method_types: ["card"],
          line_items: [{ price: price.id, quantity: 1 }],
          subscription_data: { metadata: run.metadata },
          metadata: run.metadata,
          success_url: "https://example.com/checkout-complete",
          cancel_url: "https://example.com/checkout-canceled",
        },
        { idempotencyKey: `${run.scope}/${run.id}/checkout` },
      );
      if (
        !session.url ||
        session.livemode ||
        new URL(session.url).hostname !== "checkout.stripe.com"
      )
        throw new Error("Expected a test Stripe Checkout session.");
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(session.url);
        await page.locator("#cardNumber").fill("4242424242424242");
        await page.locator("#cardExpiry").fill("1235");
        await page.locator("#cardCvc").fill("123");
        await page.locator("#billingName").fill("Quantile automated test");
        if (await page.locator("#billingCountry").isVisible())
          await page.locator("#billingCountry").selectOption("US");
        if (await page.locator("#billingPostalCode").isVisible())
          await page.locator("#billingPostalCode").fill("10001");
        await page.getByRole("button", { name: /Subscribe|Pay/i }).click();
        const id = session.id;
        session = await until(async () => {
          const current = await stripe.checkout.sessions.retrieve(id);
          return current.status === "complete" ? current : undefined;
        }, "test Checkout payment");
      } finally {
        await browser.close();
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId)
        throw new Error("Checkout did not create a subscription.");
      const initial = await stripe.subscriptions.retrieve(subscriptionId);
      assertTestOwnership(initial, run);
      const invoiceId =
        typeof initial.latest_invoice === "string"
          ? initial.latest_invoice
          : initial.latest_invoice?.id;
      let localExecution: string | undefined;
      if (local) {
        // Stripe's deployed endpoint ignores local-target events. Replay the real
        // test event into local route code with a local signature, then use real
        // preview Workflows/Stripe/Resend. Deployed tests verify Stripe's delivery.
        const event = await until(async () => {
          const events = stripe.events.list({
            type: "invoice.payment_succeeded",
            created: { gte: session?.created ?? 0 },
            limit: 100,
          });
          for await (const candidate of events) {
            if (
              candidate.type === "invoice.payment_succeeded" &&
              candidate.data.object.id === invoiceId
            )
              return candidate;
          }
          return undefined;
        }, "Stripe test payment event");
        const response = await POST(signedRequest(event, signingSecret));
        expect(response.status).toBe(200);
        localExecution = (await response.json()).execution;
      }
      const execution = await until(async () => {
        const candidates = localExecution
          ? [
              await cloud<Execution>(
                `https://workflowexecutions.googleapis.com/v1/${localExecution}`,
              ),
            ]
          : ((
              await cloud<{ executions?: Execution[] }>(
                `${workflow.url}?view=FULL&filter=${encodeURIComponent(`labels."test_run":"${run.id}"`)}`,
              )
            ).executions ?? []);
        const own = candidates.filter(
          (item) =>
            item.labels?.test_run === run.id &&
            item.labels?.namespace === run.scope,
        );
        if (
          own.some(
            (item) => item.state === "FAILED" || item.state === "CANCELLED",
          )
        )
          throw new Error(
            `Welcome workflow failed for ${run.scope}/${run.id}. Inspect its execution.`,
          );
        return own.find((item) => item.state === "SUCCEEDED");
      }, "welcome workflow completion");
      expect(
        execution.workflowRevisionId,
        "PR workflow changed during this test; rerun against the new deployment",
      ).toBe(revision);
      const result = JSON.parse(execution.result ?? "{}");
      const saved = await stripe.subscriptions.retrieve(subscriptionId);
      assertTestOwnership(saved, run);
      expect(saved.metadata.quantile_welcome_email_id).toBe(result.resendId);
      expect(typeof result.resendId).toBe("string");
      expect(result.resendId.length).toBeGreaterThan(0);
      await until(async () => {
        const response = await fetch(
          `https://api.resend.com/emails/${encodeURIComponent(result.resendId)}`,
          {
            headers: { Authorization: `Bearer ${resendKey}` },
            signal: AbortSignal.timeout(20_000),
          },
        );
        if (response.status === 429) return undefined;
        if (!response.ok)
          throw new Error(
            `Resend test inspection failed (${response.status}).`,
          );
        const email = await response.json();
        expect(email.to).toEqual([run.recipient]);
        return email.last_event === delivery ? true : undefined;
      }, `Resend ${delivery} event`);
      // Replay only this run's immutable job. A persisted Stripe receipt must
      // suppress another send even in a new execution, independent of event IDs.
      const replay = await cloud<Execution>(workflow.url, {
        argument: execution.argument,
        callLogLevel: "LOG_NONE",
        executionHistoryLevel: "EXECUTION_HISTORY_BASIC",
        labels: { namespace: run.scope, test_run: run.id },
      });
      const replayDone = await until(async () => {
        const current = await cloud<Execution>(
          `https://workflowexecutions.googleapis.com/v1/${replay.name}`,
        );
        if (current.state === "FAILED")
          throw new Error("Receipt replay failed.");
        return current.state === "SUCCEEDED" ? current : undefined;
      }, "receipt-based duplicate suppression");
      expect(replayDone.workflowRevisionId).toBe(revision);
      expect(JSON.parse(replayDone.result ?? "{}")).toMatchObject({
        result: "duplicate",
        resendId: result.resendId,
      });
      expect(
        (JSON.parse(execution.argument) as WelcomeJob).subscriptionId,
      ).toBe(subscriptionId);
    } finally {
      if (session) {
        const current = await stripe.checkout.sessions.retrieve(session.id);
        assertTestOwnership(current, run);
        if (current.status === "open")
          await stripe.checkout.sessions.expire(current.id);
      }
      if (customer) {
        const current = await stripe.customers.retrieve(customer.id);
        if (!current.deleted) {
          assertTestOwnership(current, run);
          // Deleting this run-owned test customer also cancels its subscriptions.
          // Never scan/delete customers or subscriptions belonging to other runs.
          await stripe.customers.del(current.id);
        }
      }
    }
  }, 420_000);

  it("exposes an isolated failed execution with a configured alert policy", async () => {
    if (required("WELCOME_MODE") !== "test")
      throw new Error("Failure probes require test mode.");
    const run = createTestRun(
      required("WELCOME_TEST_SCOPE"),
      "preview",
      "delivered",
    );
    const workflow = readWorkflowTarget(process.env);
    const job: WelcomeJob = {
      eventId: `evt_probe_${run.id}`,
      subscriptionId: `sub_probe_${run.id}`,
      mode: "test",
      idempotencyKey: `welcome/test/sub_probe_${run.id}`,
      testScope: run.scope,
      testRun: run.id,
      testTarget: run.target,
      mail: {
        from: "probe@example.invalid",
        reply_to: "probe@example.invalid",
        to: ["not-a-simulator@example.invalid"],
        subject: "Never send",
        html: "<p>Never send</p>",
        text: "Never send",
      },
    };
    // Rejects before reading credentials or calling providers. No shared keys,
    // subscriptions, workflow definitions or retry settings are changed.
    const created = await cloud<Execution>(workflow.url, {
      argument: JSON.stringify(job),
      callLogLevel: "LOG_NONE",
      executionHistoryLevel: "EXECUTION_HISTORY_BASIC",
      labels: { namespace: run.scope, test_run: run.id },
    });
    const failed = await until(async () => {
      const current = await cloud<Execution>(
        `https://workflowexecutions.googleapis.com/v1/${created.name}`,
      );
      return ["FAILED", "SUCCEEDED", "CANCELLED"].includes(current.state)
        ? current
        : undefined;
    }, "isolated failure probe");
    expect(failed.state).toBe("FAILED");
    const policy = await cloud<{
      enabled?: boolean;
      notificationChannels?: string[];
      userLabels?: Record<string, string>;
    }>(
      `https://monitoring.googleapis.com/v3/${required("WELCOME_ALERT_POLICY")}`,
    );
    expect(policy.enabled).not.toBe(false);
    expect(policy.userLabels?.namespace).toBe(run.scope);
    expect(policy.notificationChannels?.length ?? 0).toBeGreaterThan(0);
    console.info(
      `Expected failure probe: ${created.name}. Verify its alert reached the private destination.`,
    );
    // Policy configuration is not proof of notification receipt. Destination
    // verification remains part of private preview approval before production.
  }, 150_000);
});
