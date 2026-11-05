import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";

type NewsletterArticle = {
  slug: string;
  title: string;
  date: string;
  preview: string;
  image: string;
  imageAlt: string;
  placeholder: boolean;
  content: string;
};

const directory = path.join(process.cwd(), "content/newsletter");

export const getNewsletterArticles = cache(
  async (): Promise<NewsletterArticle[]> => {
    const files = (await readdir(directory)).filter((file) =>
      file.endsWith(".md"),
    );
    const articles = await Promise.all(
      files.map(async (file) => {
        const { data, content } = matter(
          await readFile(path.join(directory, file), "utf8"),
        );
        for (const field of ["title", "date", "preview", "image", "imageAlt"]) {
          if (typeof data[field] !== "string" || !data[field].trim()) {
            throw new Error(`Missing newsletter ${field} in ${file}`);
          }
        }
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
          !Number.isFinite(Date.parse(data.date))
        ) {
          throw new Error(`Invalid newsletter date in ${file}`);
        }
        return {
          slug: file.slice(0, -3),
          title: data.title,
          date: data.date,
          preview: data.preview,
          image: data.image,
          imageAlt: data.imageAlt,
          placeholder: data.placeholder === true,
          content,
        };
      }),
    );
    return articles.sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
  },
);

export async function getNewsletterArticle(slug: string) {
  return (await getNewsletterArticles()).find(
    (article) => article.slug === slug,
  );
}

export async function getNewsletterPage({
  page,
  sort,
  perPage,
}: {
  page?: string | string[];
  sort?: string | string[];
  perPage: number;
}) {
  const articles = [...(await getNewsletterArticles())];
  const order = sort === "oldest" ? "oldest" : "newest";
  if (order === "oldest") {
    articles.sort(
      (a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug),
    );
  }
  const totalPages = Math.max(1, Math.ceil(articles.length / perPage));
  const requested =
    typeof page === "string" && /^\d+$/.test(page) ? Number(page) : 1;
  const currentPage = Math.min(totalPages, Math.max(1, requested));
  return {
    articles: articles.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    ),
    currentPage,
    totalPages,
    sort: order,
  };
}
