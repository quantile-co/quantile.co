import type { MetadataRoute } from "next";
import { getNewsletterArticles } from "@/lib/newsletter";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getNewsletterArticles();
  return [
    { url: "https://quantile.co", changeFrequency: "weekly", priority: 1 },
    {
      url: "https://quantile.co/newsletter",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://quantile.co/consulting",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://quantile.co/brand",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...articles
      .filter((article) => !article.placeholder)
      .map((article) => ({
        url: `https://quantile.co/newsletter/${article.slug}`,
        lastModified: article.date,
      })),
  ];
}
