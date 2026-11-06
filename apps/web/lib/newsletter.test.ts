import { readFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import {
  getNewsletterArticle,
  getNewsletterArticles,
  getNewsletterPage,
} from "./newsletter";

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({
  readdir: async () =>
    Array.from(
      { length: 14 },
      (_, i) => `issue-${String(i + 1).padStart(2, "0")}.md`,
    ),
  readFile: vi.fn(async (file: string) => {
    const number = file.match(/issue-(\d+)\.md$/)?.[1];
    return `---
title: "Issue ${number}"
date: "2026-10-${number}"
contributor: aj-welch
subtitle: "A short subtitle"
image: "/cover.svg"
imageAlt: "Cover"
---
Article body ${number}.
`;
  }),
}));

it("resolves the article's contributor from the local contributor map", async () => {
  const articles = await getNewsletterArticles();
  expect(articles).toHaveLength(14);
  for (const article of articles) {
    expect(article.contributor).toEqual({
      name: "AJ Welch",
      image: "/images/contributors/aj-welch.webp",
    });
  }
});

it.each([
  "",
  "contributor: unknown",
  "contributor: toString",
  "contributor: __proto__",
  "contributor: [aj-welch]",
])(
  "rejects missing, invalid or unknown contributors (%s)",
  async (frontmatter) => {
    vi.mocked(readFile).mockResolvedValueOnce(`---
title: "Example"
date: "2026-10-01"
${frontmatter}
subtitle: "Example subtitle"
image: "/cover.svg"
imageAlt: "Cover"
---
Body.
`);
    await expect(getNewsletterArticles()).rejects.toThrow(
      /newsletter contributor/,
    );
  },
);

it("sorts before paging, with no repeated or missing articles across either page size", async () => {
  for (const perPage of [11, 9]) {
    for (const sort of ["newest", "oldest"]) {
      const first = await getNewsletterPage({ perPage, sort });
      const second = await getNewsletterPage({ perPage, sort, page: "2" });
      expect(first.articles).toHaveLength(perPage);
      expect(second.articles).toHaveLength(14 - perPage);
      const slugs = [...first.articles, ...second.articles].map(
        ({ slug }) => slug,
      );
      const expected = Array.from(
        { length: 14 },
        (_, i) => `issue-${String(i + 1).padStart(2, "0")}`,
      );
      expect(slugs).toEqual(sort === "oldest" ? expected : expected.reverse());
    }
  }
});

it("handles invalid page input and only looks up known article slugs", async () => {
  for (const page of ["bad", "-1", "0", "1.5", ["2", "3"]]) {
    expect((await getNewsletterPage({ perPage: 10, page })).currentPage).toBe(
      1,
    );
  }
  expect(
    (await getNewsletterPage({ perPage: 10, page: "999" })).currentPage,
  ).toBe(2);
  expect((await getNewsletterArticle("issue-01"))?.content).toContain(
    "Article body 01.",
  );
  expect(await getNewsletterArticle("../issue-01")).toBeUndefined();
  expect(await getNewsletterArticle("missing")).toBeUndefined();
});
