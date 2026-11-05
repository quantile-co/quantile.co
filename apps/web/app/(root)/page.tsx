import { Container, SimpleGrid } from "@mantine/core";
import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import { NewsletterArticleListItem } from "@/components/NewsletterArticleListItem/NewsletterArticleListItem";
import { NewsletterHero } from "@/components/NewsletterHero/NewsletterHero";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { PaginationControls } from "@/components/PaginationControls/PaginationControls";
import { getNewsletterPage } from "@/lib/newsletter";
import listingClasses from "./newsletter.module.css";

// Reserve one item per page for the consulting preview.
const articlesPerPage = 12 - 1;

const pageMetadata: Metadata = {
  title: "The AI newsletter for data leaders | Quantile",
  description: "The AI newsletter for data leaders.",
};

export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  const { currentPage } = await getNewsletterPage({
    page: (await searchParams).page,
    perPage: articlesPerPage,
  });
  return {
    ...pageMetadata,
    alternates: {
      canonical: currentPage === 1 ? "/" : `/?page=${currentPage}`,
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { articles, currentPage, totalPages } = await getNewsletterPage({
    page: (await searchParams).page,
    perPage: articlesPerPage,
  });
  return (
    <main id="main-content" tabIndex={-1}>
      <Container size="xl" px="var(--site-page-padding)" pb="xl">
        <NewsletterHero>
          <NewsletterSubscribeForm />
        </NewsletterHero>
        <SimpleGrid
          component="section"
          aria-label="Newsletter articles"
          id="articles"
          cols={{ base: 1, sm: 2, md: 3 }}
          spacing="xl"
          verticalSpacing="xl"
        >
          {articles.map((article, index) => (
            <Fragment key={article.slug}>
              <NewsletterArticleListItem
                href={`/newsletter/${article.slug}`}
                title={article.title}
                subtitle={article.subtitle}
                image={
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    sizes="(max-width: 48em) 100vw, (max-width: 62em) 50vw, 33vw"
                  />
                }
              />
              {index + 1 === Math.ceil(articles.length / 2) && (
                <NewsletterArticleListItem
                  component="aside"
                  href="/consulting"
                  label="Consulting"
                  title="Data and AI consulting"
                  subtitle="Senior data and AI engineering, working alongside your team."
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
        </SimpleGrid>
        <PaginationControls
          page={currentPage}
          total={totalPages}
          pathname="/"
          anchor="articles"
          label="Article pages"
        />
      </Container>
    </main>
  );
}
