import { describe, expect, it } from "vitest";
import {
  belongsToAppInstance,
  parseAppInstance,
  readAppInstance,
  readBillingMode,
  readCheckoutSettings,
  readDevelopmentPortalUrl,
  readEmailAddresses,
  readFathomSettings,
  readFirestoreTarget,
  readResendSendingKey,
  readStripeVerification,
  resolveFirestoreSettings,
} from "./env";

describe("app instance", () => {
  it.each(["sample", "a", "customer-website", "a".repeat(20)])(
    "accepts caller configuration without repository or environment policy: %s",
    (appInstance) => {
      expect(parseAppInstance(appInstance)).toBe(appInstance);
      expect(
        belongsToAppInstance(appInstance, `${appInstance}-${"a".repeat(32)}`),
      ).toBe(true);
    },
  );
  it.each([
    undefined,
    "",
    "UPPER",
    "../other",
    "-sample",
    "sample-",
    "1sample",
    "a".repeat(21),
  ])("rejects an invalid app instance: %s", (appInstance) => {
    expect(() => parseAppInstance(appInstance)).toThrow();
  });
  it.each([
    undefined,
    "sample",
    `samplex-${"a".repeat(32)}`,
    `other-${"a".repeat(32)}`,
    `sample-${"A".repeat(32)}`,
    `sample-${"a".repeat(31)}`,
  ])("rejects an unowned or malformed operation ID: %s", (operationId) => {
    expect(belongsToAppInstance("sample", operationId)).toBe(false);
  });
});

describe("Checkout settings", () => {
  const test = {
    STRIPE_EVENT_LIVEMODE: "false",
    STRIPE_API_KEY: "rk_test_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    QUANTILE_APP_INSTANCE: "sample",
    QUANTILE_SITE_ORIGIN: "http://127.0.0.1:3000",
  };
  it("uses only the selected development key and origin", () => {
    expect(readCheckoutSettings(test)).toEqual({
      key: "rk_test_fixture",
      livemode: false,
      mode: "development",
      priceId: "price_fixture",
      appInstance: "sample",
      origin: "http://127.0.0.1:3000",
    });
  });
  it("requires an explicitly enabled, restricted production key and HTTPS origin", () => {
    const production = {
      ...test,
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_API_KEY: "rk_live_fixture",
      QUANTILE_SITE_ORIGIN: "https://example.com",
    };
    expect(readCheckoutSettings(production).livemode).toBe(true);
    for (const invalid of [
      { STRIPE_API_KEY: "rk_test_fixture" },
      { STRIPE_API_KEY: "sk_live_fixture" },
      { QUANTILE_SITE_ORIGIN: "http://example.com" },
      { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
    ])
      expect(() =>
        readCheckoutSettings({ ...production, ...invalid }),
      ).toThrow();
  });
  it.each([
    { STRIPE_EVENT_LIVEMODE: undefined },
    { STRIPE_API_KEY: "rk_live_fixture" },
    { STRIPE_API_KEY: undefined },
    { STRIPE_PRICE_ID: "not-a-price" },
    { QUANTILE_SITE_ORIGIN: "https://example.com/path" },
    { QUANTILE_SITE_ORIGIN: "https://example.com?q=redirect" },
    { QUANTILE_SITE_ORIGIN: "https://user:pass@example.com" },
    { QUANTILE_SITE_ORIGIN: "http://example.com" },
  ])("rejects invalid test Checkout configuration", (invalid) => {
    expect(() => readCheckoutSettings({ ...test, ...invalid })).toThrow();
  });
});

describe("Fathom build settings", () => {
  const configured = {
    NODE_ENV: "production",
    NEXT_PUBLIC_FATHOM_SITE_ID: "TESTSITE",
    NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS: "example.test,www.example.test",
  };

  it("has no production defaults and is disabled without a site ID", () => {
    expect(readFathomSettings({})).toBeNull();
    expect(readFathomSettings({ NODE_ENV: "production" })).toBeNull();
    expect(
      readFathomSettings({ ...configured, NEXT_PUBLIC_FATHOM_SITE_ID: " " }),
    ).toBeNull();
  });

  it.each(["development", "test"])("is disabled in %s", (NODE_ENV) => {
    expect(readFathomSettings({ ...configured, NODE_ENV })).toBeNull();
  });

  it("accepts separate targets and normalizes exact hostname lists", () => {
    expect(readFathomSettings(configured)).toEqual({
      siteId: "TESTSITE",
      domains: ["example.test", "www.example.test"],
    });
    expect(
      readFathomSettings({
        ...configured,
        NEXT_PUBLIC_FATHOM_SITE_ID: "OTHERSIT",
        NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS: " Other.test,other.test ",
      }),
    ).toEqual({ siteId: "OTHERSIT", domains: ["other.test"] });
  });

  it.each([
    undefined,
    "",
    "example.test,",
    "https://example.test",
    "example.test/path",
    "example.test:3000",
    "*.example.test",
    "localhost",
    "127.0.0.1",
    "-example.test",
  ])("rejects unsafe or missing domains: %s", (domains) => {
    expect(() =>
      readFathomSettings({
        ...configured,
        NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS: domains,
      }),
    ).toThrow("Invalid Fathom configuration.");
  });

  it("rejects a malformed site ID without exposing the supplied value", () => {
    expect(() =>
      readFathomSettings({ ...configured, NEXT_PUBLIC_FATHOM_SITE_ID: "bad" }),
    ).toThrow("Invalid Fathom configuration.");
  });
});

describe("Firestore connection settings", () => {
  it.each(["", "https://evil.example", "../project"])(
    "rejects invalid project %s",
    (projectId) => {
      expect(() => resolveFirestoreSettings({ projectId })).toThrow();
    },
  );
  it.each([
    "evil.example:8080",
    "127.0.0.1:0",
    "localhost:65536",
    "https://localhost:8080",
  ])("rejects unsafe emulator %s", (emulatorHost) => {
    expect(() =>
      resolveFirestoreSettings({ projectId: "demo-quantile", emulatorHost }),
    ).toThrow();
  });
  it("resolves emulator SDK settings including IPv6", () => {
    expect(
      resolveFirestoreSettings({
        projectId: "demo-quantile",
        emulatorHost: "[::1]:8080",
      }),
    ).toEqual({
      projectId: "demo-quantile",
      databaseId: "(default)",
      host: "[::1]:8080",
      ssl: false,
      clientOptions: { universeDomain: "googleapis.com" },
    });
  });
});

describe("development portal configuration", () => {
  const url = "https://billing.quantile.co/p/login/test_fixture";
  it("leaves ordinary builds unchanged without requiring credentials", () => {
    expect(readDevelopmentPortalUrl({})).toBeUndefined();
  });
  it.each(["production", "development"])(
    "accepts a discovered development URL in %s",
    (NODE_ENV) => {
      expect(
        readDevelopmentPortalUrl({
          NODE_ENV,
          STRIPE_EVENT_LIVEMODE: "false",
          QUANTILE_DEVELOPMENT_PORTAL_URL: url,
        }),
      ).toBe(url);
    },
  );
  it.each([
    "",
    "not-a-url",
    "https://billing.quantile.co/p/login/live",
    "https://evil.example/p/login/test_fixture",
    "http://billing.stripe.com/p/login/test_fixture",
    "https://user:password@billing.stripe.com/p/login/test_fixture",
    `${url}?prefilled_email=private`,
    `${url}#fragment`,
  ])("rejects unsafe portal URL %s", (value) => {
    expect(() =>
      readDevelopmentPortalUrl({
        STRIPE_EVENT_LIVEMODE: "false",
        QUANTILE_DEVELOPMENT_PORTAL_URL: value,
      }),
    ).toThrow("Invalid development billing portal URL.");
  });
  it.each([undefined, "true"])(
    "rejects overrides without explicit development billing: %s",
    (mode) => {
      expect(() =>
        readDevelopmentPortalUrl({
          STRIPE_EVENT_LIVEMODE: mode,
          QUANTILE_DEVELOPMENT_PORTAL_URL: url,
        }),
      ).toThrow();
    },
  );
});

describe("staged environment readers", () => {
  it.each([
    ["false", "development"],
    ["true", "production"],
  ])(
    "maps Stripe livemode=%s independently of build mode",
    (STRIPE_EVENT_LIVEMODE, mode) => {
      for (const NODE_ENV of ["development", "production", "test"])
        expect(readBillingMode({ STRIPE_EVENT_LIVEMODE, NODE_ENV })).toEqual({
          livemode: STRIPE_EVENT_LIVEMODE === "true",
          mode,
        });
    },
  );
  it("normalizes app settings without requiring unrelated secrets", () => {
    const env = {
      STRIPE_EVENT_LIVEMODE: "false",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      QUANTILE_APP_INSTANCE: "sample",
    };
    expect(readStripeVerification(env)).toEqual({
      livemode: false,
      mode: "development",
      signingSecret: "whsec_fixture",
    });
    expect(readAppInstance(env)).toBe("sample");
    expect(
      readFirestoreTarget({ GCP_PROJECT_ID: "demo-quantile" }, "development"),
    ).toEqual({ projectId: "demo-quantile", databaseId: "(default)" });
    expect(
      readEmailAddresses({
        QUANTILE_EMAIL_FROM: "sender@example.com",
        QUANTILE_EMAIL_REPLY_TO: "reply@example.com",
      }),
    ).toEqual({ from: "sender@example.com", replyTo: "reply@example.com" });
  });
  it.each([undefined, "", "test", "live", "TRUE", "1", "0"])(
    "fails closed for invalid STRIPE_EVENT_LIVEMODE=%s",
    (value) => {
      expect(() => readBillingMode({ STRIPE_EVENT_LIVEMODE: value })).toThrow();
    },
  );
  it("refuses production billing against an emulator", () => {
    expect(() =>
      readFirestoreTarget(
        {
          GCP_PROJECT_ID: "demo-quantile",
          FIRESTORE_EMULATOR_HOST: "localhost:8080",
        },
        "production",
      ),
    ).toThrow("Production billing cannot use an emulator.");
  });
  it("does not require today's sending key when reading verification config", () => {
    const env = {
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    };
    expect(readStripeVerification(env).mode).toBe("production");
    expect(() => readResendSendingKey(env)).toThrow();
  });
});
