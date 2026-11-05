import { Box, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import classes from "./NewsletterConsultingCTA.module.css";

export function NewsletterConsultingCTA({
  variant = "grid",
}: {
  variant?: "grid" | "list";
}) {
  return (
    <Box
      component="aside"
      aria-label="Consulting"
      className={classes.root}
      data-layout={variant}
    >
      <Link href="/consulting" className={classes.link}>
        <div className={classes.image}>
          <span className={classes.wordmark} role="img" aria-label="Quantile" />
        </div>
        <Stack gap="xs" className={classes.content}>
          {variant === "list" && (
            <Text size="xs" c="dimmed">
              Consulting
            </Text>
          )}
          <Title order={2} className={classes.title}>
            Data and AI consulting
          </Title>
          <Text c="dimmed" className={classes.preview}>
            Senior data and AI engineering, working alongside your team.
          </Text>
        </Stack>
      </Link>
    </Box>
  );
}
