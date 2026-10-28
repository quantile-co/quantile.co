import { describe, expect, it } from "vitest";
import { readFathomSettings } from "./settings";

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
