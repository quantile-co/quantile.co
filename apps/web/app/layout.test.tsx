import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => <span data-analytics-integration="" />,
}));

describe("shared root layout", () => {
  it("owns the shared chrome, theme controls and optional analytics integration", () => {
    const html = renderToStaticMarkup(<RootLayout>Content</RootLayout>);
    expect(html).toContain("Content");
    expect(html.match(/<header/g)).toHaveLength(1);
    expect(html.match(/<footer/g)).toHaveLength(1);
    expect(html.match(/aria-label="Quantile home"/g)).toHaveLength(2);
    expect(html.match(/data-site-cta="booking"/g)).toHaveLength(1);
    expect(html).toContain('href="https://cal.com/aj-welch/book-a-call"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain("Select a display theme");
    expect(html).toContain(`© ${new Date().getFullYear()} Quantile LLC`);
    expect(html).toContain("data-analytics-integration");
  });
});
