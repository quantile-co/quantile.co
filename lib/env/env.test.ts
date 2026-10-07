import { describe, expect, it } from "vitest";
import {
  belongsToAppInstance,
  parseAppInstance,
  readAppInstance,
  readCheckoutSettings,
  readEmailAddresses,
  readFirestoreTarget,
  readResendSendingKey,
  readStripeEventMode,
  readStripeVerification,
} from "./env";

describe("app instance", () => {
  it.each([
    "sample",
    "a",
    "customer-website",
    "a".repeat(20),
  ])("accepts caller configuration without repository or environment policy: %s", (appInstance) => {
    expect(parseAppInstance(appInstance)).toBe(appInstance);
    expect(
      belongsToAppInstance(appInstance, `${appInstance}-${"a".repeat(32)}`),
    ).toBe(true);
  });
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
  it("uses only the selected Sandbox key and origin", () => {
    expect(readCheckoutSettings(test)).toEqual({
      key: "rk_test_fixture",
      livemode: false,
      mode: "test",
      priceId: "price_fixture",
      appInstance: "sample",
      origin: "http://127.0.0.1:3000",
    });
  });
  it("requires an explicitly enabled, restricted live key and HTTPS origin", () => {
    const live = {
      ...test,
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_API_KEY: "rk_live_fixture",
      QUANTILE_SITE_ORIGIN: "https://example.com",
    };
    expect(readCheckoutSettings(live).livemode).toBe(true);
    for (const invalid of [
      { STRIPE_API_KEY: "rk_test_fixture" },
      { STRIPE_API_KEY: "sk_live_fixture" },
      { QUANTILE_SITE_ORIGIN: "http://example.com" },
      { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
    ])
      expect(() => readCheckoutSettings({ ...live, ...invalid })).toThrow();
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

describe("staged environment readers", () => {
  it("normalizes app settings without requiring unrelated secrets", () => {
    const env = {
      STRIPE_EVENT_LIVEMODE: "false",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      QUANTILE_APP_INSTANCE: "sample",
    };
    expect(readStripeVerification(env)).toEqual({
      livemode: false,
      mode: "test",
      signingSecret: "whsec_fixture",
    });
    expect(readAppInstance(env)).toBe("sample");
    expect(
      readFirestoreTarget({ GCP_PROJECT_ID: "demo-quantile" }, "test"),
    ).toEqual({ projectId: "demo-quantile", emulatorHost: undefined });
    expect(
      readEmailAddresses({
        QUANTILE_EMAIL_FROM: "sender@example.com",
        QUANTILE_EMAIL_REPLY_TO: "reply@example.com",
      }),
    ).toEqual({ from: "sender@example.com", replyTo: "reply@example.com" });
  });
  it.each([
    undefined,
    "",
    "test",
    "live",
    "TRUE",
    "1",
    "0",
  ])("fails closed for invalid STRIPE_EVENT_LIVEMODE=%s", (value) => {
    expect(() =>
      readStripeEventMode({ STRIPE_EVENT_LIVEMODE: value }),
    ).toThrow();
  });
  it("refuses live billing against an emulator", () => {
    expect(() =>
      readFirestoreTarget(
        {
          GCP_PROJECT_ID: "demo-quantile",
          FIRESTORE_EMULATOR_HOST: "localhost:8080",
        },
        "live",
      ),
    ).toThrow("Live billing cannot use an emulator.");
  });
  it("does not require today's sending key when reading verification config", () => {
    const env = {
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    };
    expect(readStripeVerification(env).mode).toBe("live");
    expect(() => readResendSendingKey(env)).toThrow();
  });
});
