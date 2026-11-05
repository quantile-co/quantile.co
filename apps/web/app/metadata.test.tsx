import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { site } from "@/lib/metadata";
import * as newsletter from "@/lib/newsletter";
import { metadata as consultingMetadata } from "./(root)/consulting/page";
import Article, {
  generateMetadata as articleMetadata,
} from "./(root)/newsletter/[slug]/page";
import { generateMetadata as archiveMetadata } from "./(root)/newsletter/page";
import Home, { generateMetadata as homeMetadata } from "./(root)/page";
import RootLayout from "./layout";

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

it("describes both homepage offerings and renders the shared site identity without authors", async () => {
  const metadata = await homeMetadata({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  });
  expect(metadata.title).toBe(
    "AI Newsletter & Consulting for Data Leaders | Quantile",
  );
  expect(metadata.description).toBe(
    "AI insights for data leaders. Hands-on engineering for data and AI teams.",
  );
  const html = renderToStaticMarkup(
    <RootLayout>
      {await Home({ searchParams: Promise.resolve({}) })}
    </RootLayout>,
  );
  const data = structuredData(html);
  expect(data.map((entry) => entry["@type"])).toEqual([
    "Organization",
    "WebSite",
  ]);
  expect(data.every((entry) => entry.name === "Quantile")).toBe(true);
  expect(JSON.stringify(data)).not.toMatch(/AJ Welch|"author"|"Person"/);
  expect(html).toContain("The AI newsletter for data leaders.");
});

it("keeps pagination self-canonical and only noindexes alternative sorting", async () => {
  const home = await homeMetadata({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ page: "2", utm_source: "preview" }),
  });
  expect(home.alternates?.canonical).toBe(`${site.url}/?page=2`);
  for (const sort of ["newest", "oldest"]) {
    const metadata = await archiveMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ page: "2", sort, utm_source: "preview" }),
    });
    expect(metadata.alternates?.canonical).toBe(
      `${site.url}/newsletter?${sort === "oldest" ? "sort=oldest&" : ""}page=2`,
    );
    expect(metadata.robots).toEqual(
      sort === "oldest" ? { index: false, follow: true } : undefined,
    );
  }
});

it("gives consulting matching explicit Open Graph and Twitter images", () => {
  expect(consultingMetadata.openGraph?.images).toEqual(
    consultingMetadata.twitter?.images,
  );
  expect(consultingMetadata.openGraph?.images).toEqual([
    {
      url: `${site.url}/opengraph-image.png`,
      alt: "Quantile wordmark",
      width: 1200,
      height: 630,
    },
  ]);
});

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
    const metadata = await articleMetadata(props);
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
