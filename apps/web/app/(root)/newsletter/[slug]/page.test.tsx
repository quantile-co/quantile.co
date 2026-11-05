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
  "handles published/placeholder article metadata without author fields (placeholder=%s)",
  async (placeholder) => {
    vi.spyOn(newsletter, "getNewsletterArticle").mockResolvedValue({
      slug: "example",
      title: "An example </script> title",
      subtitle: "Practical engineering notes.",
      date: "2026-10-01",
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
    expect(metadata.authors).toBeUndefined();
    const html = renderToStaticMarkup(
      <RootLayout>{await Article(props)}</RootLayout>,
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
      expect(data[0]).not.toHaveProperty("author");
      expect(data[0]).not.toHaveProperty("dateModified");
      expect(html).toContain("\\u003c/script>");
    }
  },
);
