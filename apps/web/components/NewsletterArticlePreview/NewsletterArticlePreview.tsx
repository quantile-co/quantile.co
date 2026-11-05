import { Box, Stack, Text, Title } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import classes from "./NewsletterArticlePreview.module.css";

export function NewsletterArticlePreview({
  slug,
  title,
  preview,
  image,
  imageAlt,
  date,
  variant = "grid",
}: {
  slug: string;
  title: string;
  preview: string;
  image: string;
  imageAlt: string;
  date: string;
  variant?: "grid" | "list";
}) {
  return (
    <Box component="article" className={classes.article} data-layout={variant}>
      <Link href={`/newsletter/${slug}`} className={classes.link}>
        <div className={classes.image}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes={
              variant === "list"
                ? "(max-width: 48em) 96px, 160px"
                : "(max-width: 48em) 100vw, (max-width: 62em) 50vw, 33vw"
            }
          />
        </div>
        <Stack gap="xs" className={classes.content}>
          {variant === "list" && (
            <Text component="time" dateTime={date} size="xs" c="dimmed">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(date))}
            </Text>
          )}
          <Title order={2} className={classes.title}>
            {title}
          </Title>
          <Text c="dimmed" className={classes.preview}>
            {preview}
          </Text>
        </Stack>
      </Link>
    </Box>
  );
}
