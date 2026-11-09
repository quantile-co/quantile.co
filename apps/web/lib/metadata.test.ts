import { expect, it } from "vitest";
import { createPageMetadata, site } from "./metadata";

it("uses absolute canonical URLs and matching branded social images by default", () => {
  const metadata = createPageMetadata({
    title: "Example",
    description: "Example description.",
    pathname: "/example?page=2",
  });
  expect(metadata.title).toBe("Example | Quantile");
  expect(metadata.description).toBe("Example description.");
  expect(metadata.alternates?.canonical).toBe(`${site.url}/example?page=2`);
  expect(metadata.openGraph).toMatchObject({
    type: "website",
    url: `${site.url}/example?page=2`,
    siteName: site.name,
    images: [
      {
        url: `${site.url}/opengraph-image.png`,
        alt: "Quantile wordmark",
        width: 1200,
        height: 630,
      },
    ],
  });
  expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
  expect(metadata.robots).toBeUndefined();
});
