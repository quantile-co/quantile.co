import { Container, Text, Title } from "@mantine/core";
import Image from "next/image";
import classes from "./BrandAssetsPage.module.css";

type BrandAssetFile = {
  details: string;
  format: "PNG" | "SVG";
  href: string;
};

type BrandAsset = {
  alt: string;
  files: readonly BrandAssetFile[];
  name: string;
  preview: {
    height: number;
    src: string;
    tone: "dark" | "light";
    width: number;
  };
};

export type BrandAssetGroup = {
  assets: readonly BrandAsset[];
  kind: "banner" | "logo" | "wordmark";
  title: string;
};

type BrandAssetsPageProps = {
  groups: readonly BrandAssetGroup[];
};

export function BrandAssetsPage({ groups }: BrandAssetsPageProps) {
  return (
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

        {groups.map((group, groupIndex) => {
          const headingId = `brand-${group.title.toLowerCase().replaceAll(" ", "-")}`;

          return (
            <section
              aria-labelledby={headingId}
              className={classes.group}
              key={group.title}
            >
              <Title className={classes.sectionTitle} id={headingId} order={2}>
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
      </Container>
    </main>
  );
}
