import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";

afterEach(() => vi.unstubAllEnvs());

describe("site response policies", () => {
  it.each([true, false])(
    "keeps security headers (development=%s)",
    async (development) => {
      vi.stubEnv("NODE_ENV", development ? "development" : "production");
      const rules = await nextConfig.headers();
      const headers = Object.fromEntries(
        rules[0].headers.map(({ key, value }) => [key, value]),
      );
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Permissions-Policy"]).toContain("payment=()");
      expect(headers["Referrer-Policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      const policy = headers["Content-Security-Policy"];
      const directives = new Map(
        policy.split(";").map((directive) => {
          const [name, ...sources] = directive.trim().split(/\s+/);
          return [name, sources];
        }),
      );
      for (const name of ["script-src", "img-src", "connect-src"])
        expect(directives.get(name)).toContain("https://cdn.usefathom.com");
      for (const name of ["object-src", "frame-ancestors", "form-action"])
        expect(directives.get(name)).toEqual(["'none'"]);
      expect(policy).not.toMatch(/stripe|calendly|billing|\*\.usefathom\.com/);
      expect(policy.includes("'unsafe-eval'")).toBe(development);
      expect(rules.some((rule) => rule.source === "/images/:path*")).toBe(
        !development,
      );
    },
  );
});
