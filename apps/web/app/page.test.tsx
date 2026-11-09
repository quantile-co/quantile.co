import { expect, it } from "vitest";
import { site } from "@/lib/metadata";
import { metadata } from "./page";

it("gives the consulting homepage its canonical URL and matching social images", () => {
  expect(metadata.title).toBe("Data and AI Engineering | Quantile");
  expect(metadata.openGraph?.title).toBe(metadata.title);
  expect(metadata.twitter?.title).toBe(metadata.title);
  expect(metadata.description).toBe(site.description);
  expect(metadata.alternates?.canonical).toBe(`${site.url}/`);
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
