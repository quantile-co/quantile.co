import type { Metadata } from "next";
import {
  type BrandAssetGroup,
  BrandAssetsPage,
} from "@/components/BrandAssetsPage/BrandAssetsPage";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

const brandDescription =
  "Download the Quantile logo, wordmark, and social banners.";
const signUpHref = "https://checkout.stripe.dev/";
const primarySections = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const metadata: Metadata = {
  title: "Quantile brand assets",
  description: brandDescription,
  alternates: { canonical: "/brand" },
  openGraph: {
    title: "Quantile brand assets",
    description: brandDescription,
    siteName: "Quantile",
    type: "website",
    url: "/brand",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quantile brand assets",
    description: brandDescription,
  },
};

const groups = [
  {
    title: "Logo",
    kind: "logo",
    assets: [
      {
        name: "Dark",
        alt: "Light Quantile logo on a dark background",
        preview: {
          src: "/images/brand/logo-dark-1024.png",
          width: 1024,
          height: 1024,
          tone: "dark",
        },
        files: [
          {
            format: "PNG",
            details: "1024 × 1024",
            href: "/images/brand/logo-dark-1024.png",
          },
          {
            format: "SVG",
            details: "Scalable",
            href: "/images/brand/logo-dark.svg",
          },
        ],
      },
      {
        name: "Light",
        alt: "Dark Quantile logo on a light background",
        preview: {
          src: "/images/brand/logo-light-1024.png",
          width: 1024,
          height: 1024,
          tone: "light",
        },
        files: [
          {
            format: "PNG",
            details: "1024 × 1024",
            href: "/images/brand/logo-light-1024.png",
          },
          {
            format: "SVG",
            details: "Scalable",
            href: "/images/brand/logo-light.svg",
          },
        ],
      },
    ],
  },
  {
    title: "Wordmark",
    kind: "wordmark",
    assets: [
      {
        name: "Dark",
        alt: "Light Quantile wordmark on a dark background",
        preview: {
          src: "/images/brand/wordmark-dark-1600.png",
          width: 1600,
          height: 551,
          tone: "dark",
        },
        files: [
          {
            format: "PNG",
            details: "1600 × 551",
            href: "/images/brand/wordmark-dark-1600.png",
          },
          {
            format: "SVG",
            details: "Scalable",
            href: "/images/brand/wordmark-dark.svg",
          },
        ],
      },
      {
        name: "Light",
        alt: "Dark Quantile wordmark on a light background",
        preview: {
          src: "/images/brand/wordmark-light-1600.png",
          width: 1600,
          height: 551,
          tone: "light",
        },
        files: [
          {
            format: "PNG",
            details: "1600 × 551",
            href: "/images/brand/wordmark-light-1600.png",
          },
          {
            format: "SVG",
            details: "Scalable",
            href: "/images/brand/wordmark-light.svg",
          },
        ],
      },
    ],
  },
  {
    title: "Social banners",
    kind: "banner",
    assets: [
      {
        name: "X",
        alt: "Quantile wordmark on a dark X header",
        preview: {
          src: "/images/brand/x-header-1500x500.png",
          width: 1500,
          height: 500,
          tone: "dark",
        },
        files: [
          {
            format: "PNG",
            details: "1500 × 500",
            href: "/images/brand/x-header-1500x500.png",
          },
        ],
      },
      {
        name: "General",
        alt: "Quantile wordmark on a dark social preview",
        preview: {
          src: "/images/brand/social-preview-1200x630.png",
          width: 1200,
          height: 630,
          tone: "dark",
        },
        files: [
          {
            format: "PNG",
            details: "1200 × 630",
            href: "/images/brand/social-preview-1200x630.png",
          },
        ],
      },
    ],
  },
] as const satisfies readonly BrandAssetGroup[];

export default function BrandPage() {
  return (
    <div>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <SiteHeader
        bookCallHref="/#book-a-call"
        homeHref="/"
        logo={<BrandLogo />}
        sections={primarySections}
        signUpHref={signUpHref}
      />
      <BrandAssetsPage groups={groups} />
      <SiteFooter
        homeHref="/"
        logo={<BrandLogo />}
        sections={primarySections}
        themeSwitcher={<ThemeSwitcher />}
      />
    </div>
  );
}
