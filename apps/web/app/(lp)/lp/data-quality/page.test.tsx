import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import LandingLayout from "../../layout";
import DataQualityPage from "./page";

vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => null,
}));

it("keeps campaign routes disabled through the group layout", () => {
  expect(() => LandingLayout()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});

it("preserves the dormant letter, proof and booking action without a site header", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <DataQualityPage />
    </RootLayout>,
  );

  expect(html).not.toContain("<header");
  expect(html.match(/<footer/g)).toHaveLength(1);
  expect(html).toContain('id="main-content"');
  expect(html).toContain(
    "AI is transformational. So why is your data team plagued by the same issues?",
  );
  expect(html).toContain('aria-label="Company experience and client work"');
  expect(html).toContain("$7k for 40 hours per month.");
  expect(html.match(/data-site-cta="booking"/g)).toHaveLength(1);
  expect(html).toContain('href="https://cal.com/aj-welch/book-a-call"');
  expect(html).toContain('href="mailto:aj@quantile.co"');
});
