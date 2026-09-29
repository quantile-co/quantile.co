import { describe, expect, it, vi } from "vitest";
import { createStripeWebhook } from "../../../webhook";
import { createInvoicePaymentSucceededHandler } from "../handler";
import { config, paymentEvent, signedRequest } from "../test-helpers";
import { createWelcomeEmailHandler, readWelcomeConfig } from "./handler";

function setup(overrides = {}) {
  const startWorkflow = vi
    .fn()
    .mockResolvedValue(
      "projects/local-test/locations/us-central1/workflows/welcome/executions/test-123",
    );
  const report = vi.fn();
  const settings = { ...config, ...overrides };
  const handler = createStripeWebhook({
    config: settings,
    handlers: {
      "invoice.payment_succeeded": createInvoicePaymentSucceededHandler({
        welcomeEmail: createWelcomeEmailHandler({
          config: settings,
          createExecution: startWorkflow,
          report,
        }),
      }),
    },
    report,
  });
  return { startWorkflow, handler, report };
}

describe("welcome email action", () => {
  it.each([
    1, 2, 3, 4, 5,
  ])("starts a welcome workflow for %i issues", async (quantity) => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent();
    event.data.object.lines.data[0].quantity = quantity;
    const response = await handler(signedRequest(event));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: "accepted" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const job = startWorkflow.mock.calls[0][0];
    expect(job.mail.to).toEqual([config.testRecipient]);
    expect(job.mail.subject).toBe("[Test] Welcome to Quantile");
    expect(job.mail.text.replace(/\s+/g, " ")).toContain(
      `${quantity} concurrent in-progress`,
    );
    expect(job.mail.reply_to).toBe(config.replyTo);
    expect(job.idempotencyKey).toBe("welcome/test/sub_local_customer");
    expect(job.eventId).toBe(event.id);
  });

  it("uses the customer's address only in explicitly configured live mode", async () => {
    const { handler, startWorkflow } = setup({ mode: "live" });
    expect(
      (await handler(signedRequest(paymentEvent({}, { livemode: true }))))
        .status,
    ).toBe(200);
    expect(startWorkflow.mock.calls[0][0].mail.to).toEqual([
      "customer@example.com",
    ]);
    expect(startWorkflow.mock.calls[0][0].idempotencyKey).toBe(
      "welcome/live/sub_local_customer",
    );
  });

  it.each([
    { billing_reason: "subscription_cycle" },
    { billing_reason: "subscription_update" },
    { status: "open" },
    { amount_paid: 0 },
  ])("ignores renewals, upgrades and unpaid invoices: %o", async (invoice) => {
    const { handler, startWorkflow } = setup();
    expect((await handler(signedRequest(paymentEvent(invoice)))).status).toBe(
      200,
    );
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    "another-developer",
    "preview",
    undefined,
  ])("ignores another test scope: %s", async (scope) => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent({
      parent: {
        subscription_details: {
          subscription: "sub_other",
          metadata: { quantile_test_scope: scope },
        },
      },
    });
    expect(await (await handler(signedRequest(event))).json()).toEqual({
      result: "Ignored",
    });
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it("does not let the deployed preview consume a connected-local run", async () => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent();
    event.data.object.parent.subscription_details.metadata.quantile_test_target =
      "local-unique-session";
    expect(await (await handler(signedRequest(event))).json()).toEqual({
      result: "Ignored",
    });
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it("labels each run independently while retaining its subscription retry key", async () => {
    const { handler, startWorkflow } = setup();
    const first = paymentEvent();
    const second = paymentEvent();
    second.data.object.parent.subscription_details.subscription = "sub_second";
    second.data.object.parent.subscription_details.metadata.quantile_test_run =
      "00000000000000000000000000000002";
    await Promise.all([
      handler(signedRequest(first)),
      handler(signedRequest(second)),
    ]);
    const jobs = startWorkflow.mock.calls.map(([job]) => job);
    expect(new Set(jobs.map((job) => job.testRun)).size).toBe(2);
    expect(new Set(jobs.map((job) => job.mail.to[0])).size).toBe(2);
    expect(jobs.every((job) => job.testScope === "pr-1")).toBe(true);
  });

  it.each([
    "",
    "not-a-run",
    "other@example.com",
  ])("rejects unsafe run identifiers: %s", async (run) => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent();
    event.data.object.parent.subscription_details.metadata.quantile_test_run =
      run;
    expect((await handler(signedRequest(event))).status).toBe(400);
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it("ignores other products", async () => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent();
    event.data.object.lines.data[0].pricing.price_details.price = "price_other";
    expect((await handler(signedRequest(event))).status).toBe(200);
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    { customer_email: null },
    { customer_email: "not-an-email" },
    { currency: "eur" },
    { lines: null },
  ])("rejects invalid eligible invoices: %o", async (invoice) => {
    const { handler, startWorkflow } = setup();
    expect((await handler(signedRequest(paymentEvent(invoice)))).status).toBe(
      400,
    );
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    0,
    6,
    1.5,
    null,
  ])("rejects invalid capacity %s", async (quantity) => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent({
      lines: {
        has_more: false,
        data: [
          { quantity, pricing: { price_details: { price: config.priceId } } },
        ],
      },
    });
    expect((await handler(signedRequest(event))).status).toBe(400);
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it("rejects truncated lists and multiple matching lines", async () => {
    const { handler, startWorkflow } = setup();
    const event = paymentEvent();
    event.data.object.lines.has_more = true;
    expect((await handler(signedRequest(event))).status).toBe(400);
    event.data.object.lines.has_more = false;
    event.data.object.lines.data.push(event.data.object.lines.data[0]);
    expect((await handler(signedRequest(event))).status).toBe(400);
    expect(startWorkflow).not.toHaveBeenCalled();
  });

  it("keeps subscription idempotency and payload stable across duplicate event IDs", async () => {
    const { handler, startWorkflow } = setup();
    await handler(signedRequest());
    await handler(signedRequest(paymentEvent({}, { id: "evt_another" })));
    expect(startWorkflow).toHaveBeenCalledTimes(2);
    const [a, b] = startWorkflow.mock.calls.map(([job]) => job);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.mail).toEqual(b.mail);
    expect(a.eventId).not.toBe(b.eventId);
  });

  it("isolates separate developers' subscriptions without randomizing retry keys", async () => {
    const { handler, startWorkflow } = setup();
    await handler(signedRequest());
    const event = paymentEvent();
    event.data.object.parent.subscription_details.subscription =
      "sub_another_test";
    await handler(signedRequest(event));
    expect(startWorkflow.mock.calls[0][0].idempotencyKey).not.toBe(
      startWorkflow.mock.calls[1][0].idempotencyKey,
    );
  });

  it("waits for durable acceptance before returning 200", async () => {
    const { handler, startWorkflow } = setup();
    let accept: (name: string) => void = () => {};
    startWorkflow.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          accept = resolve;
        }),
    );
    let finished = false;
    const response = handler(signedRequest()).then((value) => {
      finished = true;
      return value;
    });
    await vi.waitFor(() => expect(startWorkflow).toHaveBeenCalled());
    expect(finished).toBe(false);
    accept("execution-confirmed");
    expect((await response).status).toBe(200);
  });

  it("returns 503 for an unconfirmed start, without leaking provider details", async () => {
    const { handler, startWorkflow, report } = setup();
    startWorkflow.mockRejectedValueOnce(new Error("secret cloud detail"));
    const response = await handler(signedRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(report).toHaveBeenCalledWith(
      "welcome_workflow_start_failed",
      "evt_local_payment",
    );
    expect((await handler(signedRequest())).status).toBe(200);
  });
});

describe("runtime config", () => {
  const env = {
    WELCOME_MODE: "test",
    STRIPE_WEBHOOK_SECRET: config.signingSecret,
    STRIPE_CAPACITY_PRICE_ID: config.priceId,
    WELCOME_FROM: config.from,
    WELCOME_REPLY_TO: config.replyTo,
    WELCOME_TEST_RECIPIENT: config.testRecipient,
    WELCOME_TEST_SCOPE: config.testScope,
  };
  it("accepts configured test delivery", () =>
    expect(readWelcomeConfig(env)).toEqual(config));
  it.each([
    "customer@example.com",
    "delivered@resend.dev.evil.test",
    "suppressed+tag@resend.dev",
    "",
    undefined,
  ])("blocks unsafe recipients: %s", (recipient) => {
    expect(() =>
      readWelcomeConfig({ ...env, WELCOME_TEST_RECIPIENT: recipient }),
    ).toThrow();
  });
  it.each([
    "delivered+local@resend.dev",
    "bounced+local@resend.dev",
    "complained@resend.dev",
    "suppressed@resend.dev",
  ])("allows simulator address %s", (recipient) => {
    expect(
      readWelcomeConfig({ ...env, WELCOME_TEST_RECIPIENT: recipient })
        .testRecipient,
    ).toBe(recipient);
  });
  it("fails closed on missing scope/configuration or unknown mode", () => {
    expect(() => readWelcomeConfig({})).toThrow();
    expect(() =>
      readWelcomeConfig({ ...env, WELCOME_TEST_SCOPE: undefined }),
    ).toThrow();
    expect(() =>
      readWelcomeConfig({ ...env, WELCOME_MODE: "production" }),
    ).toThrow();
  });
});
