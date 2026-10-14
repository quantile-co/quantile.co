import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://quantile.co",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://quantile.co/brand",
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
