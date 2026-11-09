import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "./layout";
import Home from "./page";

vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => <span data-analytics-integration="" />,
}));

it("composes the consulting homepage with only compact copyright and theme controls", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <Home />
    </RootLayout>,
  );
  expect(html).not.toContain("<header");
  expect(html).not.toContain("<nav");
  expect(html.match(/<footer/g)).toHaveLength(1);
  expect(html).toContain(`© ${new Date().getFullYear()} Quantile LLC`);
  expect(html).not.toContain('aria-label="Quantile home"');
  expect(html).toContain('id="main-content"');
  expect(html).toContain('href="#main-content"');
  expect(html).not.toContain('href="/newsletter');
  expect(html).not.toContain('href="/consulting"');
  expect(html).not.toContain("<form");
  expect(html).toContain("Hi, I&#x27;m AJ.");
  expect(html.match(/data-site-cta="booking"/g)).toHaveLength(1);
  expect(html).toContain("Select a display theme");
  expect(html).toContain("data-analytics-integration");
});
