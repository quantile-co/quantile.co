import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the homepage and brand page", () => {
    expect(sitemap().map(({ url }) => url)).toEqual([
      "https://quantile.co",
      "https://quantile.co/brand",
    ]);
  });
});
