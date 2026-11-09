import type { MetadataRoute } from "next";
import { site } from "@/lib/metadata";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url }, { url: `${site.url}/brand` }];
}
