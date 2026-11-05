import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { site } from "@/lib/metadata";
import Home, { generateMetadata } from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/components/FathomAnalytics/FathomAnalytics", () => ({
  FathomAnalytics: () => null,
}));

function structuredData(html: string) {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].flatMap((match) => JSON.parse(match[1]));
}

it("describes both homepage offerings and renders the shared site identity without authors", async () => {
  const metadata = await generateMetadata({
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

it("keeps homepage pagination self-canonical without tracking parameters", async () => {
  const metadata = await generateMetadata({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ page: "2", utm_source: "preview" }),
  });
  expect(metadata.alternates?.canonical).toBe(`${site.url}/?page=2`);
});
