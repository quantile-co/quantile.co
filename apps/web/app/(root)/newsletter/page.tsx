import { Anchor, Container, Group, Stack } from "@mantine/core";
import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import { NewsletterArticleByline } from "@/components/NewsletterArticleByline/NewsletterArticleByline";
import { NewsletterArticleListItem } from "@/components/NewsletterArticleListItem/NewsletterArticleListItem";
import { NewsletterHero } from "@/components/NewsletterHero/NewsletterHero";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { PaginationControls } from "@/components/PaginationControls/PaginationControls";
import { createPageMetadata } from "@/lib/metadata";
import { getNewsletterPage } from "@/lib/newsletter";
import listingClasses from "../newsletter.module.css";
import classes from "./page.module.css";

// Reserve one item per page for the consulting preview.
const articlesPerPage = 10 - 1;

export async function generateMetadata({
  searchParams,
}: PageProps<"/newsletter">): Promise<Metadata> {
  const { currentPage, sort } = await getNewsletterPage({
    ...(await searchParams),
    perPage: articlesPerPage,
  });
  const query = new URLSearchParams();
  if (sort === "oldest") query.set("sort", "oldest");
  if (currentPage > 1) query.set("page", String(currentPage));
  return createPageMetadata({
    title: "AI Newsletter for Data Leaders",
    description: "The AI newsletter for data leaders.",
    pathname: `/newsletter${query.size ? `?${query}` : ""}`,
    noindex: sort === "oldest",
  });
}

export default async function Newsletter({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; sort?: string | string[] }>;
}) {
  const result = await getNewsletterPage({
    ...(await searchParams),
    perPage: articlesPerPage,
  });
  return (
    <main id="main-content" tabIndex={-1}>
      <Container size="xl" px="var(--site-page-padding)" pb="xl">
        <NewsletterHero>
          <NewsletterSubscribeForm
            layout="compact"
            buttonProps={{ children: "Subscribe" }}
          />
        </NewsletterHero>
        <Container size="sm" px={0} id="articles">
          <Group
            component="nav"
            aria-label="Article order"
            justify="center"
            gap="md"
            mb="md"
          >
            <Anchor
              href="/newsletter#articles"
              className={classes.sortLink}
              aria-current={result.sort === "newest" ? "page" : undefined}
            >
              Newest
            </Anchor>
            <Anchor
              href="/newsletter?sort=oldest#articles"
              className={classes.sortLink}
              aria-current={result.sort === "oldest" ? "page" : undefined}
            >
              Oldest
            </Anchor>
          </Group>
          <Stack component="section" aria-label="Newsletter articles" gap={0}>
            {result.articles.map((article, index) => (
              <Fragment key={article.slug}>
                <NewsletterArticleListItem
                  href={`/newsletter/${article.slug}`}
                  title={article.title}
                  subtitle={article.subtitle}
                  date={article.date}
                  byline={
                    <NewsletterArticleByline
                      contributor={article.contributor}
                    />
                  }
                  variant="list"
                  image={
                    <Image
                      src={article.image}
                      alt={article.imageAlt}
                      fill
                      sizes="(max-width: 48em) 96px, 160px"
                    />
                  }
                />
                {index + 1 === Math.ceil(result.articles.length / 2) && (
                  <NewsletterArticleListItem
                    component="aside"
                    href="/consulting"
                    label="Consulting"
                    title="Data and AI consulting"
                    subtitle="Senior data and AI engineering, working alongside your team."
                    variant="list"
                    image={
                      <div className={listingClasses.consultingImage}>
                        <span
                          className={listingClasses.wordmark}
                          role="img"
                          aria-label="Quantile"
                        />
                      </div>
                    }
                  />
                )}
              </Fragment>
            ))}
          </Stack>
          <PaginationControls
            page={result.currentPage}
            total={result.totalPages}
            pathname="/newsletter"
            query={result.sort === "oldest" ? { sort: "oldest" } : undefined}
            anchor="articles"
            label="Article pages"
          />
        </Container>
      </Container>
    </main>
  );
}
