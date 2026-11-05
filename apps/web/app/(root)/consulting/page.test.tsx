import { expect, it } from "vitest";
import { site } from "@/lib/metadata";
import { metadata } from "./page";

it("gives consulting matching explicit Open Graph and Twitter images", () => {
  expect(metadata.openGraph?.images).toEqual(metadata.twitter?.images);
  expect(metadata.openGraph?.images).toEqual([
    {
      url: `${site.url}/opengraph-image.png`,
      alt: "Quantile wordmark",
      width: 1200,
      height: 630,
    },
  ]);
});
