import { expect, it } from "vitest";
import sitemap from "./sitemap";

it("lists only the consulting homepage and brand page", () => {
  expect(sitemap()).toEqual([
    { url: "https://quantile.co" },
    { url: "https://quantile.co/brand" },
  ]);
});
