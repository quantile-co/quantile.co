import { describe, expect, it } from "vitest";
import firebaseConfig from "../../firebase.json";
import { readHeaderSettings } from "../env/env";
import { siteHeaders } from "./headers";

describe("site response policies", () => {
  it.each([
    "development",
    "production",
    "test",
  ])("keeps security headers enabled in %s", (NODE_ENV) => {
    const rules = siteHeaders(readHeaderSettings({ NODE_ENV }));
    const headers = Object.fromEntries(
      rules[0].headers.map(({ key, value }) => [key, value]),
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toContain("payment=()");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["Content-Security-Policy"].includes("'unsafe-eval'")).toBe(
      NODE_ENV === "development",
    );
    expect(rules.some((rule) => rule.source === "/images/:path*")).toBe(
      NODE_ENV === "production",
    );
  });
  it("uses the canonical production policy byte-for-byte", () => {
    expect(
      siteHeaders(readHeaderSettings({ NODE_ENV: "production" }))[0].headers,
    ).toEqual(
      firebaseConfig.hosting.headers.find((rule) => rule.source === "**")
        ?.headers,
    );
  });
  it("does not mutate the production policy when preparing development headers", () => {
    const before = JSON.stringify(firebaseConfig);
    siteHeaders(readHeaderSettings({ NODE_ENV: "development" }));
    expect(JSON.stringify(firebaseConfig)).toBe(before);
  });
});
