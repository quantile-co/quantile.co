import type { Metadata } from "next";

export const site = {
  name: "Quantile",
  url: "https://quantile.co",
  description:
    "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.",
};

export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  logo: `${site.url}/apple-icon.png`,
  description: site.description,
};

export const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  name: site.name,
  url: site.url,
  description: site.description,
  publisher: { "@id": organization["@id"] },
};

export function createPageMetadata({
  title,
  description,
  pathname,
  image = {
    url: "/opengraph-image.png",
    alt: "Quantile wordmark",
    width: 1200,
    height: 630,
  },
  noindex = false,
  publishedTime,
}: {
  title: string;
  description: string;
  pathname: string;
  image?: { url: string; alt: string; width?: number; height?: number };
  noindex?: boolean;
  publishedTime?: string;
}): Metadata {
  const pageTitle = `${title} | ${site.name}`;
  const social = {
    title: pageTitle,
    description,
    url: new URL(pathname, site.url).href,
    siteName: site.name,
    images: [{ ...image, url: new URL(image.url, site.url).href }],
  };
  return {
    title: pageTitle,
    description,
    alternates: { canonical: social.url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: publishedTime
      ? { ...social, type: "article", publishedTime }
      : { ...social, type: "website" },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: social.images,
    },
  };
}
