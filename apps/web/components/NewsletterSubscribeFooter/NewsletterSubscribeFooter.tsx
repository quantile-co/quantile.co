import { Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./NewsletterSubscribeFooter.module.css";

export function NewsletterSubscribeFooter({
  titleId,
  form,
}: {
  titleId: string;
  form: ReactNode;
}) {
  return (
    <Stack
      component="footer"
      align="center"
      gap="lg"
      aria-labelledby={titleId}
      className={classes.subscribe}
    >
      <Title order={2} id={titleId} className={classes.title}>
        The AI newsletter for data leaders.
      </Title>
      <div className={classes.form}>{form}</div>
    </Stack>
  );
}
