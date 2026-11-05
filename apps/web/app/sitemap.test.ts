import { expect, it, vi } from "vitest";
import sitemap from "./sitemap";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/newsletter", () => ({
  getNewsletterArticles: async () => [
    { slug: "published", date: "2026-10-01", placeholder: false },
    { slug: "preview", date: "2026-10-02", placeholder: true },
  ],
}));

it("includes real articles but keeps placeholder articles and campaign pages out of discovery", async () => {
  const urls = (await sitemap()).map(({ url }) => url);
  expect(urls).toContain("https://quantile.co/newsletter/published");
  expect(urls).not.toContain("https://quantile.co/newsletter/preview");
  expect(urls.some((url) => url.includes("/lp/"))).toBe(false);
});
