import { Container, SimpleGrid } from "@mantine/core";
import type { Metadata } from "next";
import { Fragment } from "react";
import { NewsletterArticlePagination } from "@/components/NewsletterArticlePagination/NewsletterArticlePagination";
import { NewsletterArticlePreview } from "@/components/NewsletterArticlePreview/NewsletterArticlePreview";
import { NewsletterConsultingCTA } from "@/components/NewsletterConsultingCTA/NewsletterConsultingCTA";
import { NewsletterHero } from "@/components/NewsletterHero/NewsletterHero";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { getNewsletterPage } from "@/lib/newsletter";

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
              <NewsletterArticlePreview {...article} />
              {index + 1 === Math.ceil(articles.length / 2) && (
                <NewsletterConsultingCTA />
              )}
            </Fragment>
          ))}
        </SimpleGrid>
        <NewsletterArticlePagination
          page={currentPage}
          total={totalPages}
          pathname="/"
        />
      </Container>
    </main>
  );
}
