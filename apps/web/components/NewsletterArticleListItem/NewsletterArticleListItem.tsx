import { Box, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import classes from "./NewsletterArticleListItem.module.css";

export function NewsletterArticleListItem({
  href,
  title,
  subtitle,
  image,
  date,
  label,
  component = "article",
  variant = "grid",
}: {
  href: string;
  title: string;
  subtitle: string;
  image: ReactNode;
  date?: string;
  label?: string;
  component?: "article" | "aside";
  variant?: "grid" | "list";
}) {
  return (
    <Box
      component={component}
      aria-label={component === "aside" ? label : undefined}
      className={classes.article}
      data-layout={variant}
    >
      <Link href={href} className={classes.link}>
        <div className={classes.image}>{image}</div>
        <Stack gap="xs" className={classes.content}>
          {variant === "list" && date && (
            <Text component="time" dateTime={date} size="xs" c="dimmed">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(date))}
            </Text>
          )}
          {variant === "list" && label && (
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          )}
          <Title order={2} className={classes.title}>
            {title}
          </Title>
          <Text c="dimmed" className={classes.subtitle}>
            {subtitle}
          </Text>
        </Stack>
      </Link>
    </Box>
  );
}
