import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { site } from "@/lib/metadata";
import Newsletter, { generateMetadata } from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => null,
}));

it.each(["newest", "oldest"])(
  "renders contributor/date bylines in %s order",
  async (sort) => {
    const html = renderToStaticMarkup(
      <RootLayout>
        {await Newsletter({ searchParams: Promise.resolve({ sort }) })}
      </RootLayout>,
    );
    expect(html.match(/>AJ Welch<\/span>/g)).toHaveLength(10);
    expect(html).not.toContain("By AJ Welch");
    const consulting = html.match(/<aside\b[\s\S]*?<\/aside>/)?.[0];
    expect(consulting).toContain("Data and AI consulting");
    expect(consulting).toContain(">AJ Welch</span>");
    expect(consulting).toContain(
      encodeURIComponent("/images/contributors/aj-welch.webp"),
    );
    expect(consulting).not.toContain("<time");
    expect(html.match(/<time\b[^>]*dateTime=/g)).toHaveLength(9);
    const articles = [...html.matchAll(/<article\b[\s\S]*?<\/article>/g)];
    expect(articles).toHaveLength(9);
    for (const [article] of articles) {
      expect(article).toMatch(
        /<time\b[\s\S]*?<\/time><h2\b[\s\S]*?<\/h2><p\b[\s\S]*?<\/p>[\s\S]*?>AJ Welch<\/span>/,
      );
    }
    expect(html).toContain(
      encodeURIComponent("/images/contributors/aj-welch.webp"),
    );
  },
);

it("keeps pagination self-canonical and only noindexes alternative sorting", async () => {
  for (const sort of ["newest", "oldest"]) {
    const metadata = await generateMetadata({
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
