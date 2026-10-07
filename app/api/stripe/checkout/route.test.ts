import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  init: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    constructor(key: string) {
      provider.init(key);
    }
    prices = { retrieve: provider.retrieve };
    checkout = { sessions: { create: provider.create } };
  },
}));

import { POST } from "./route";

const origin = "http://127.0.0.1:3000";
const keys = [
  "STRIPE_EVENT_LIVEMODE",
  "STRIPE_API_KEY",
  "STRIPE_PRICE_ID",
  "QUANTILE_APP_INSTANCE",
  "QUANTILE_SITE_ORIGIN",
  "FIRESTORE_EMULATOR_HOST",
] as const;
const original = new Map<string, string | undefined>();

function submit(from = origin, target = origin) {
  return POST(
    new Request(`${target}/api/stripe/checkout`, {
      method: "POST",
      headers: { Origin: from, Host: new URL(target).host },
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const key of keys) original.set(key, process.env[key]);
  delete process.env.FIRESTORE_EMULATOR_HOST;
  Object.assign(process.env, {
    STRIPE_EVENT_LIVEMODE: "false",
    STRIPE_API_KEY: "rk_test_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    QUANTILE_APP_INSTANCE: "sample",
    QUANTILE_SITE_ORIGIN: origin,
  });
  provider.retrieve.mockResolvedValue({
    active: true,
    livemode: false,
    currency: "usd",
    unit_amount: 499_500,
    recurring: { interval: "month", usage_type: "licensed" },
  });
  provider.create.mockResolvedValue({
    livemode: false,
    url: "https://checkout.stripe.com/c/pay/cs_test_fixture",
  });
});
afterEach(() => {
  for (const key of keys) {
    const prior = original.get(key);
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  }
  original.clear();
  vi.restoreAllMocks();
});

describe("Checkout start", () => {
  it("creates an owned subscription Checkout from a same-origin POST", async () => {
    const response = await submit();
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "https://checkout.stripe.com/c/pay/cs_test_fixture",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(provider.init).toHaveBeenCalledWith("rk_test_fixture");
    expect(provider.retrieve).toHaveBeenCalledWith("price_fixture");
    const [params, options] = provider.create.mock.calls[0];
    expect(params).toMatchObject({
      mode: "subscription",
      line_items: [
        {
          price: "price_fixture",
          quantity: 1,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 },
        },
      ],
      success_url: `${origin}/welcome?sandbox=1`,
      cancel_url: `${origin}/#pricing`,
    });
    const metadata = params.subscription_data.metadata;
    expect(metadata).toEqual(params.metadata);
    expect(metadata).toMatchObject({
      quantile_app_instance: "sample",
      quantile_test_delivery: "delivered",
    });
    expect(metadata.quantile_test_id).toMatch(/^sample-[a-f0-9]{32}$/);
    expect(options.idempotencyKey).toBe(
      `checkout/${metadata.quantile_test_id}`,
    );
    await submit();
    expect(provider.create.mock.calls[1][0].metadata.quantile_test_id).not.toBe(
      metadata.quantile_test_id,
    );
  });

  it("accepts only same-port localhost aliases in local test mode", async () => {
    const local = "http://localhost:3000";
    expect((await submit(local, local)).status).toBe(303);
    expect(provider.create.mock.calls[0][0].success_url).toBe(
      `${origin}/welcome?sandbox=1`,
    );
    for (const [from, target] of [
      ["http://localhost:3001", "http://localhost:3001"],
      [local, origin],
      ["http://attacker.example:3000", "http://attacker.example:3000"],
      ["http://localhost:3000/", local],
    ])
      expect((await submit(from, target)).status).toBe(403);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });

  it("does not allow local aliases in live mode or for a public test origin", async () => {
    const local = "http://localhost:3000";
    process.env.QUANTILE_SITE_ORIGIN = "https://example.com";
    expect((await submit(local, local)).status).toBe(403);
    Object.assign(process.env, {
      QUANTILE_SITE_ORIGIN: "https://127.0.0.1:3000",
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_API_KEY: "rk_live_fixture",
    });
    expect(
      (await submit("https://localhost:3000", "https://localhost:3000")).status,
    ).toBe(403);
    expect(provider.init).not.toHaveBeenCalled();
  });

  it("refuses a foreign or missing Origin before calling Stripe", async () => {
    for (const from of ["https://another.example", ""]) {
      const response = await submit(from);
      expect(response.status).toBe(403);
    }
    expect(provider.init).not.toHaveBeenCalled();
  });

  it("refuses missing credentials or mode/key mismatch without leaking values", async () => {
    for (const changes of [
      { STRIPE_API_KEY: "" },
      { STRIPE_API_KEY: "rk_live_fixture" },
      { STRIPE_EVENT_LIVEMODE: "invalid" },
    ]) {
      Object.assign(process.env, changes);
      const response = await submit();
      expect(response.status).toBe(503);
      expect(await response.text()).toBe("Checkout unavailable");
      Object.assign(process.env, {
        STRIPE_EVENT_LIVEMODE: "false",
        STRIPE_API_KEY: "rk_test_fixture",
      });
    }
    expect(provider.init).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("checkout_unavailable");
  });

  it("refuses an ineligible Price and a non-Stripe redirect", async () => {
    provider.retrieve.mockResolvedValueOnce({
      active: true,
      livemode: true,
      currency: "usd",
      unit_amount: 499_500,
      recurring: { interval: "month", usage_type: "licensed" },
    });
    expect((await submit()).status).toBe(503);
    expect(provider.create).not.toHaveBeenCalled();
    provider.create.mockResolvedValueOnce({
      livemode: false,
      url: "https://checkout.example.com/other",
    });
    expect((await submit()).status).toBe(503);
  });

  it("in live mode uses a restricted live key and sends no test operation metadata", async () => {
    Object.assign(process.env, {
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_API_KEY: "rk_live_fixture",
      QUANTILE_SITE_ORIGIN: "https://example.com",
    });
    provider.retrieve.mockResolvedValue({
      active: true,
      livemode: true,
      currency: "usd",
      unit_amount: 499_500,
      recurring: { interval: "month", usage_type: "licensed" },
    });
    provider.create.mockResolvedValue({
      livemode: true,
      url: "https://checkout.stripe.com/c/pay/cs_live_fixture",
    });
    expect((await submit("https://example.com")).status).toBe(303);
    expect(provider.create.mock.calls[0][0].subscription_data.metadata).toEqual(
      {
        quantile_app_instance: "sample",
      },
    );
    expect(provider.create.mock.calls[0][0].success_url).toBe(
      "https://example.com/welcome",
    );
    expect(provider.create.mock.calls[0][1].idempotencyKey).toMatch(
      /^checkout\/sample-[a-f0-9]{32}$/,
    );
    provider.retrieve.mockResolvedValueOnce({
      active: true,
      livemode: true,
      currency: "usd",
      unit_amount: 100,
      recurring: { interval: "month", usage_type: "licensed" },
    });
    expect((await submit("https://example.com")).status).toBe(503);
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    expect((await submit("https://example.com")).status).toBe(503);
  });
});
