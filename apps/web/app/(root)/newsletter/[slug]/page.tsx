import { Container, Stack, Text, Title, Typography } from "@mantine/core";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { NewsletterArticleByline } from "@/components/NewsletterArticleByline/NewsletterArticleByline";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { createPageMetadata, organization, site } from "@/lib/metadata";
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
    ...createPageMetadata({
      title: article.title,
      description: article.subtitle,
      pathname: `/newsletter/${article.slug}`,
      noindex: article.placeholder,
      publishedTime: article.date,
      image: article.placeholder
        ? undefined
        : { url: article.image, alt: article.imageAlt },
    }),
    authors: [{ name: article.contributor.name }],
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
      {!article.placeholder && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `${site.url}/newsletter/${article.slug}#article`,
            mainEntityOfPage: `${site.url}/newsletter/${article.slug}`,
            headline: article.title,
            description: article.subtitle,
            image: new URL(article.image, site.url).href,
            datePublished: article.date,
            author: {
              "@type": "Person",
              name: article.contributor.name,
              image: new URL(article.contributor.image, site.url).href,
            },
            publisher: {
              "@type": "Organization",
              "@id": organization["@id"],
              name: site.name,
              url: site.url,
              logo: organization.logo,
            },
          }).replace(/</g, "\\u003c")}
        </script>
      )}
      <Container size={800} px="var(--site-page-padding)" py="xl">
        <Stack component="article" gap="xl" className={classes.article}>
          <Stack component="header" gap="sm">
            <Title order={1} className={classes.title}>
              {article.title}
            </Title>
            <Text
              component="p"
              fz={{ base: "lg", sm: "xl" }}
              c="dimmed"
              lh="md"
            >
              {article.subtitle}
            </Text>
            <div className={classes.bylineRow}>
              <NewsletterArticleByline
                contributor={article.contributor}
                date={article.date}
              />
            </div>
          </Stack>
          <section
            aria-labelledby="article-forwarded-title"
            className={classes.forwarded}
          >
            <Text
              component="p"
              fz={{ base: "lg", sm: "xl" }}
              c="dimmed"
              lh="md"
              id="article-forwarded-title"
              className={classes.forwardedPrompt}
            >
              <span>Was this forwarded to you?</span>{" "}
              <span>Get it straight to your inbox:</span>
            </Text>
            <div className={classes.forwardedForm}>
              <NewsletterSubscribeForm
                layout="compact"
                inputSize="sm"
                buttonProps={{ children: "Subscribe" }}
              />
            </div>
          </section>
          <Image
            className={classes.image}
            src={article.image}
            alt={article.imageAlt}
            width={1200}
            height={675}
            sizes="(max-width: 50em) 100vw, 800px"
          />
          <Typography fz={{ base: "lg", sm: "xl" }} lh="md">
            <Markdown>{article.content}</Markdown>
          </Typography>
          <Stack
            component="footer"
            align="center"
            gap="lg"
            aria-labelledby="article-subscribe-title"
            className={classes.subscribe}
          >
            <Title
              order={2}
              id="article-subscribe-title"
              className={classes.subscribeTitle}
            >
              The AI newsletter for data leaders.
            </Title>
            <div className={classes.subscribeForm}>
              <NewsletterSubscribeForm
                layout="compact"
                buttonProps={{ children: "Subscribe" }}
              />
            </div>
          </Stack>
        </Stack>
      </Container>
    </main>
  );
}
