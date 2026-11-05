import {
  Anchor,
  Container,
  Stack,
  Text,
  Title,
  Typography,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { getNewsletterArticle, getNewsletterArticles } from "@/lib/newsletter";
import classes from "./page.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getNewsletterArticles()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = await getNewsletterArticle((await params).slug);
  if (!article) notFound();
  return {
    title: `${article.title} | Quantile`,
    description: article.preview,
    alternates: { canonical: `/newsletter/${article.slug}` },
    robots: article.placeholder ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.preview,
      url: `/newsletter/${article.slug}`,
      publishedTime: article.date,
      images: [{ url: article.image, alt: article.imageAlt }],
    },
  };
}

export default async function NewsletterArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getNewsletterArticle((await params).slug);
  if (!article) notFound();

  return (
    <main id="main-content" tabIndex={-1}>
      <Container size="sm" px="var(--site-page-padding)" py="xl">
        <Stack component="article" gap="xl" className={classes.article}>
          <Anchor href="/newsletter" className={classes.backLink}>
            <IconArrowLeft size={14} aria-hidden="true" />
            All articles
          </Anchor>
          <Stack gap="sm">
            <Text component="time" dateTime={article.date} size="sm" c="dimmed">
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(article.date))}
            </Text>
            <Title order={1} className={classes.title}>
              {article.title}
            </Title>
          </Stack>
          <Image
            className={classes.image}
            src={article.image}
            alt={article.imageAlt}
            width={1200}
            height={675}
            sizes="(max-width: 48em) 100vw, 720px"
          />
          <Typography>
            <Markdown>{article.content}</Markdown>
          </Typography>
        </Stack>
      </Container>
    </main>
  );
}
