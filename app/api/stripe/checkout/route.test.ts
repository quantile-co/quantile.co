import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import firebaseConfig from "../../../../firebase.json";

const provider = vi.hoisted(() => ({ init: vi.fn(), create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    constructor(key: string) {
      provider.init(key);
    }
    checkout = { sessions: { create: provider.create } };
  },
}));

import { POST } from "./route";

const origin = "http://127.0.0.1:3000";
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
  for (const [key, value] of Object.entries({
    STRIPE_EVENT_LIVEMODE: "false",
    STRIPE_API_KEY: "rk_test_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    QUANTILE_APP_INSTANCE: "sample",
    QUANTILE_SITE_ORIGIN: origin,
    FIRESTORE_EMULATOR_HOST: "",
  }))
    vi.stubEnv(key, value);
  provider.create.mockResolvedValue({
    livemode: false,
    url: "https://checkout.stripe.com/c/pay/cs_test_fixture",
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Checkout start", () => {
  it.each([
    false,
    true,
  ])("uses the configured Price and shared operation metadata (livemode=%s)", async (livemode) => {
    const site = livemode ? "https://example.com" : origin;
    const key = livemode ? "rk_live_fixture" : "rk_test_fixture";
    vi.stubEnv("STRIPE_EVENT_LIVEMODE", String(livemode));
    vi.stubEnv("STRIPE_API_KEY", key);
    vi.stubEnv("QUANTILE_SITE_ORIGIN", site);
    provider.create.mockResolvedValue({
      livemode,
      url: "https://billing.quantile.co/c/pay/session",
    });
    const response = await submit(site);
    expect(response.status).toBe(303);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(provider.init).toHaveBeenCalledWith(key);
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
      success_url: `${site}/welcome`,
      cancel_url: `${site}/#pricing`,
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params.metadata).toEqual(params.subscription_data.metadata);
    expect(params.metadata).toEqual({
      quantile_app_instance: "sample",
      quantile_operation_id: expect.stringMatching(/^sample-[a-f0-9]{32}$/),
    });
    expect(options.idempotencyKey).toBe(
      `checkout/${params.metadata.quantile_operation_id}`,
    );
    await submit(site);
    expect(
      provider.create.mock.calls[1][0].metadata.quantile_operation_id,
    ).not.toBe(params.metadata.quantile_operation_id);
  });

  it("allows both hosted Checkout domains under the production form policy", async () => {
    const policy = firebaseConfig.hosting.headers
      .find((entry) => entry.source === "**")
      ?.headers.find(
        (header) => header.key === "Content-Security-Policy",
      )?.value;
    expect(policy).toContain(
      "form-action 'self' https://checkout.stripe.com https://billing.quantile.co;",
    );
    for (const domain of ["checkout.stripe.com", "billing.quantile.co"]) {
      provider.create.mockResolvedValueOnce({
        livemode: false,
        url: `https://${domain}/c/pay/cs_test_fixture`,
      });
      const response = await submit();
      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("Location") ?? "").hostname).toBe(
        domain,
      );
    }
  });

  it.each([
    "",
    "https://another.example",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    `${origin}/`,
  ])("rejects noncanonical Origin %s before calling Stripe", async (from) => {
    expect((await submit(from, from || origin)).status).toBe(403);
    expect(provider.init).not.toHaveBeenCalled();
  });
  it("allows localhost when it is the configured canonical origin", async () => {
    vi.stubEnv("QUANTILE_SITE_ORIGIN", "http://localhost:3000");
    expect((await submit("http://localhost:3000")).status).toBe(303);
    expect(provider.create.mock.calls[0][0].success_url).toBe(
      "http://localhost:3000/welcome",
    );
  });
  it.each([
    { STRIPE_API_KEY: "" },
    { STRIPE_API_KEY: "rk_live_fixture" },
    { STRIPE_EVENT_LIVEMODE: "invalid" },
  ])("fails closed on invalid configuration", async (changes) => {
    for (const [key, value] of Object.entries(changes)) vi.stubEnv(key, value);
    const response = await submit();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Checkout unavailable");
    expect(provider.init).not.toHaveBeenCalled();
  });
  it("does not expose provider failures", async () => {
    provider.create.mockRejectedValueOnce(
      new Error("private provider details"),
    );
    const response = await submit();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Checkout unavailable");
    expect(console.error).toHaveBeenCalledWith("checkout_unavailable");
  });
  it.each([
    { livemode: true, url: "https://checkout.stripe.com/c/pay/session" },
    { livemode: false, url: null },
    { livemode: false, url: "https://checkout.example.com/other" },
    {
      livemode: false,
      url: "https://billing.quantile.co.attacker.example/session",
    },
    { livemode: false, url: "http://billing.quantile.co/session" },
    { livemode: false, url: "https://billing.quantile.co:8443/session" },
  ])("rejects an unexpected Checkout response", async (session) => {
    provider.create.mockResolvedValueOnce(session);
    expect((await submit()).status).toBe(503);
  });
});
