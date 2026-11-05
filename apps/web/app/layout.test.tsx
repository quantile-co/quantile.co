import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import SiteLayout from "./(root)/layout";
import Home from "./(root)/page";
import RootLayout from "./layout";

vi.mock("server-only", () => ({}));
vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => <span data-analytics-integration="" />,
}));

it("composes the newsletter homepage with navigation and shared chrome", async () => {
  const home = await Home({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(
    <RootLayout>
      <SiteLayout>{home}</SiteLayout>
    </RootLayout>,
  );
  expect(html.match(/<header/g)).toHaveLength(1);
  expect(html.match(/<footer/g)).toHaveLength(1);
  expect(html).toContain('id="main-content"');
  expect(html).toContain('href="#main-content"');
  expect(html).toContain('href="/newsletter"');
  expect(html).toContain('href="/consulting"');
  expect(html).not.toContain("data-site-cta");
  expect(html).toContain("Select a display theme");
  expect(html).toContain("data-analytics-integration");
});
