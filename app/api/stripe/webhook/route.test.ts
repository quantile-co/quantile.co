import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  config,
  paymentEvent,
  signedRequest,
} from "./_lib/events/invoice.payment_succeeded/test-helpers";

vi.mock("server-only", () => ({}));
const cloud = vi.hoisted(() => ({ request: vi.fn(), initialize: vi.fn() }));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    constructor(options: unknown) {
      cloud.initialize(options);
    }
    request = cloud.request;
  },
}));
const workflow =
  "projects/local-test/locations/us-central1/workflows/pr-1-welcome";

beforeEach(() => {
  vi.resetModules();
  cloud.initialize.mockReset();
  cloud.request
    .mockReset()
    .mockResolvedValue({ data: { name: `${workflow}/executions/test-123` } });
  for (const [key, value] of Object.entries({
    WELCOME_MODE: "test",
    STRIPE_WEBHOOK_SECRET: config.signingSecret,
    STRIPE_CAPACITY_PRICE_ID: config.priceId,
    WELCOME_FROM: config.from,
    WELCOME_REPLY_TO: config.replyTo,
    WELCOME_TEST_RECIPIENT: config.testRecipient,
    WELCOME_TEST_SCOPE: config.testScope,
    WELCOME_WORKFLOW: workflow,
    WELCOME_TEST_TARGET: "preview",
  }))
    vi.stubEnv(key, value);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Unexpected network request")),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Next.js POST route", () => {
  it("verifies, renders and confirms durable workflow acceptance without sending email", async () => {
    const { POST, runtime } = await import("./route");
    expect(runtime).toBe("nodejs");
    const response = await POST(signedRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: "accepted",
      execution: `${workflow}/executions/test-123`,
    });
    expect(cloud.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://workflowexecutions.googleapis.com/v1/${workflow}/executions`,
        method: "POST",
        retry: false,
      }),
    );
    const job = JSON.parse(cloud.request.mock.calls[0][0].data.argument);
    expect(job.mail.to).toEqual([config.testRecipient]);
    expect(job.mail.html).toContain("Welcome to Quantile");
    expect(job.mail.text).toContain("repository and issue-tracker links");
    expect(job.idempotencyKey).toBe("welcome/test/sub_local_customer");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not initialize cloud dependencies for unsigned requests or another test scope", async () => {
    const { POST } = await import("./route");
    expect(
      (
        await POST(
          new Request("http://localhost/api/stripe/webhook", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(400);
    const event = paymentEvent();
    event.data.object.parent.subscription_details.metadata.quantile_test_scope =
      "another-developer";
    expect(await (await POST(signedRequest(event))).json()).toEqual({
      result: "Ignored",
    });
    expect(cloud.initialize).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    "STRIPE_WEBHOOK_SECRET",
    "WELCOME_WORKFLOW",
    "WELCOME_TEST_SCOPE",
  ])("fails closed when %s is missing", async (key) => {
    vi.stubEnv(key, "");
    const { POST } = await import("./route");
    expect((await POST(signedRequest())).status).toBe(503);
    expect(cloud.initialize).not.toHaveBeenCalled();
  });

  it("returns 503 on cloud failure or an unconfirmed response", async () => {
    const { POST } = await import("./route");
    cloud.request.mockRejectedValueOnce(new Error("private cloud detail"));
    expect((await POST(signedRequest())).status).toBe(503);
    cloud.request.mockResolvedValueOnce({ data: {} });
    expect((await POST(signedRequest())).status).toBe(503);
  });

  it("rejects a workflow belonging to another PR before initializing cloud access", async () => {
    vi.stubEnv("WELCOME_WORKFLOW", workflow.replace("pr-1-", "pr-2-"));
    const { POST } = await import("./route");
    expect((await POST(signedRequest())).status).toBe(503);
    expect(cloud.initialize).not.toHaveBeenCalled();
  });
});
