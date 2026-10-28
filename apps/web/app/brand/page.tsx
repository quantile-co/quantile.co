import { Container, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import Image from "next/image";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import classes from "./page.module.css";

const brandDescription =
  "Download the Quantile logo, wordmark, and social banners.";
const brandTitle = "Quantile brand assets";
export const metadata: Metadata = {
  title: brandTitle,
  description: brandDescription,
  alternates: { canonical: "/brand" },
  openGraph: {
    title: brandTitle,
    description: brandDescription,
    siteName: "Quantile",
    type: "website",
    url: "/brand",
  },
  twitter: {
    card: "summary_large_image",
    title: brandTitle,
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
        alt: "Quantile logo, dark-background version: light mark on a dark background",
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
        alt: "Quantile logo, light-background version: dark mark on a light background",
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
        alt: "Quantile wordmark, dark-background version: light text on a dark background",
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
        alt: "Quantile wordmark, light-background version: dark text on a light background",
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
        alt: "X header: light Quantile wordmark on a dark background",
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
        alt: "Social preview: light Quantile wordmark on a dark background",
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
] as const;

export default function BrandPage() {
  return (
    <div>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <main className={classes.main} id="main-content" tabIndex={-1}>
        <Container className={classes.container} size="xl">
          <div className={classes.intro}>
            <Title className={classes.title} order={1}>
              Brand assets
            </Title>
            <Text className={classes.lede}>
              Download the Quantile logo, wordmark, and social banners.
            </Text>
          </div>
          <section aria-label="Brand assets">
            {groups.map((group, groupIndex) => {
              const headingId = `brand-${group.title.toLowerCase().replaceAll(" ", "-")}`;

              return (
                <section
                  aria-labelledby={headingId}
                  className={classes.group}
                  key={group.title}
                >
                  <Title
                    className={classes.sectionTitle}
                    id={headingId}
                    order={2}
                  >
                    {group.title}
                  </Title>

                  <div className={classes.assetGrid}>
                    {group.assets.map((asset, assetIndex) => (
                      <article className={classes.assetCard} key={asset.name}>
                        <div
                          className={classes.preview}
                          data-kind={group.kind}
                          data-tone={asset.preview.tone}
                        >
                          <Image
                            alt={asset.alt}
                            className={classes.previewImage}
                            height={asset.preview.height}
                            loading={
                              groupIndex === 0 && assetIndex === 0
                                ? "eager"
                                : undefined
                            }
                            src={asset.preview.src}
                            width={asset.preview.width}
                          />
                        </div>
                        <div className={classes.assetBody}>
                          <Title className={classes.assetTitle} order={3}>
                            {asset.name}
                          </Title>
                          <div className={classes.downloads}>
                            {asset.files.map((file) => (
                              <a
                                className={classes.download}
                                download
                                href={file.href}
                                key={file.href}
                              >
                                <span>{file.format}</span>
                                <span className={classes.downloadDetails}>
                                  {file.details}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        </Container>
      </main>
      <ThemeSwitcher />
    </div>
  );
}
