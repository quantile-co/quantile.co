import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the public canonical pages but not the checkout return page", () => {
    expect(sitemap().map(({ url }) => url)).toEqual([
      "https://quantile.co",
      "https://quantile.co/brand",
    ]);
  });
});
