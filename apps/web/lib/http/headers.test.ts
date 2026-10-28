import { describe, expect, it } from "vitest";
import { siteHeaders } from "./headers";

describe("site response policies", () => {
  it.each([true, false])(
    "keeps security headers (development=%s)",
    (development) => {
      const rules = siteHeaders(development);
      const headers = Object.fromEntries(
        rules[0].headers.map(({ key, value }) => [key, value]),
      );
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Permissions-Policy"]).toContain("payment=()");
      expect(headers["Referrer-Policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headers["Content-Security-Policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(headers["Content-Security-Policy"]).toContain(
        "form-action 'none'",
      );
      expect(headers["Content-Security-Policy"]).not.toMatch(
        /stripe|calendly|billing/,
      );
      expect(headers["Content-Security-Policy"].includes("'unsafe-eval'")).toBe(
        development,
      );
      expect(rules.some((rule) => rule.source === "/images/:path*")).toBe(
        !development,
      );
    },
  );
});
