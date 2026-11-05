import { Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./NewsletterHero.module.css";

export function NewsletterHero({ children }: { children: ReactNode }) {
  return (
    <Stack component="section" align="center" gap="md" className={classes.hero}>
      <Title order={1} className={classes.title}>
        The AI newsletter for data leaders.
      </Title>
      <div className={classes.subscription}>{children}</div>
    </Stack>
  );
}
