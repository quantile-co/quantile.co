import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { site } from "@/lib/metadata";
import * as newsletter from "@/lib/newsletter";
import Article, { generateMetadata } from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => null,
}));

afterEach(() => vi.restoreAllMocks());

function structuredData(html: string) {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].flatMap((match) => JSON.parse(match[1]));
}

it.each([false, true])(
  "renders contributor, date and signup with published/placeholder metadata (placeholder=%s)",
  async (placeholder) => {
    vi.spyOn(newsletter, "getNewsletterArticle").mockResolvedValue({
      slug: "example",
      title: "An example </script> title",
      subtitle: "Practical engineering notes.",
      date: "2026-10-01",
      contributor: {
        name: "AJ Welch",
        image: "/images/contributors/aj-welch.webp",
      },
      image: "/images/example.png",
      imageAlt: "Example article cover",
      placeholder,
      content: "Article content.",
    });
    const props = { params: Promise.resolve({ slug: "example" }) };
    const metadata = await generateMetadata(props);
    expect(metadata.openGraph?.images).toEqual(metadata.twitter?.images);
    expect(JSON.stringify(metadata.openGraph?.images)).toContain(
      placeholder ? "/opengraph-image.png" : "/images/example.png",
    );
    expect(metadata.robots).toEqual(
      placeholder ? { index: false, follow: true } : undefined,
    );
    expect(metadata.authors).toEqual([{ name: "AJ Welch" }]);
    const html = renderToStaticMarkup(
      <RootLayout>{await Article(props)}</RootLayout>,
    );
    expect(html).toMatch(/<\/h1><p\b[^>]*>Practical engineering notes\.<\/p>/);
    expect(html).toContain("AJ Welch");
    expect(html).not.toContain("By AJ Welch");
    expect(html).toMatch(/<time dateTime="2026-10-01">Oct 1, 2026<\/time>/);
    expect(html.match(/aria-label="Newsletter subscription"/g)).toHaveLength(2);
    expect(html).toContain("Was this forwarded to you?");
    expect(html).toContain("Get it straight to your inbox:");
    expect(html.indexOf('dateTime="2026-10-01"')).toBeLessThan(
      html.indexOf('id="article-forwarded-title"'),
    );
    expect(html.indexOf('id="article-forwarded-title"')).toBeLessThan(
      html.indexOf('alt="Example article cover"'),
    );
    expect(html).toContain('type="email"');
    expect(html.indexOf("Article content.")).toBeLessThan(
      html.indexOf('id="article-subscribe-title"'),
    );
    const data = structuredData(html);
    expect(data).toHaveLength(placeholder ? 0 : 1);
    if (!placeholder) {
      expect(data[0]).toMatchObject({
        "@type": "BlogPosting",
        headline: "An example </script> title",
        datePublished: "2026-10-01",
        image: `${site.url}/images/example.png`,
        publisher: { "@type": "Organization", name: "Quantile" },
      });
      expect(data[0].author).toEqual({
        "@type": "Person",
        name: "AJ Welch",
        image: `${site.url}/images/contributors/aj-welch.webp`,
      });
      expect(data[0]).not.toHaveProperty("dateModified");
      expect(html).toContain("\\u003c/script>");
    }
  },
);
