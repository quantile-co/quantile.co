import type { MetadataRoute } from "next";
import { site } from "@/lib/metadata";
import { getNewsletterArticles } from "@/lib/newsletter";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getNewsletterArticles();
  return [
    { url: site.url },
    { url: `${site.url}/newsletter` },
    { url: `${site.url}/consulting` },
    { url: `${site.url}/brand` },
    ...articles
      .filter((article) => !article.placeholder)
      .map((article) => ({ url: `${site.url}/newsletter/${article.slug}` })),
  ];
}
