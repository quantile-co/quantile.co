import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteHeaders } from "@/lib/http/headers";
import RootLayout from "./layout";

vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: ({
    siteId,
    domains,
  }: {
    siteId: string;
    domains: string[];
  }) => (
    <span
      data-analytics-site={siteId}
      data-analytics-domains={domains.join(",")}
    />
  ),
}));

afterEach(() => vi.unstubAllEnvs());

describe("root analytics composition", () => {
  it("passes only explicit public build settings to the client integration", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FATHOM_SITE_ID", "TESTSITE");
    vi.stubEnv("NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS", "example.test");
    const html = renderToStaticMarkup(<RootLayout>Content</RootLayout>);
    expect(html).toContain('data-analytics-site="TESTSITE"');
    expect(html).toContain('data-analytics-domains="example.test"');
    expect(html).toContain("Content");
  });

  it.each(["production", "development"])(
    "omits analytics when unconfigured in %s",
    (mode) => {
      vi.stubEnv("NODE_ENV", mode);
      vi.stubEnv("NEXT_PUBLIC_FATHOM_SITE_ID", undefined);
      vi.stubEnv("NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS", undefined);
      const html = renderToStaticMarkup(<RootLayout>Content</RootLayout>);
      expect(html).not.toContain("data-analytics-site");
    },
  );

  it("allows only the Fathom CDN for script, image collection and departure beacons", () => {
    const policy = siteHeaders(false)[0].headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;
    const directives = new Map(
      policy?.split(";").map((directive) => {
        const [name, ...sources] = directive.trim().split(/\s+/);
        return [name, sources];
      }),
    );
    for (const name of ["script-src", "img-src", "connect-src"])
      expect(directives.get(name)).toContain("https://cdn.usefathom.com");
    expect(policy).not.toContain("https://*.usefathom.com");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
  });
});
