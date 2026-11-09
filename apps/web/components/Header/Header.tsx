import { Container } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import classes from "./Header.module.css";

export function Header({ action }: { action: ReactNode }) {
  return (
    <header className={classes.header}>
      <Container
        size="xl"
        px="var(--site-page-padding)"
        className={classes.inner}
      >
        <Link aria-label="Quantile home" className={classes.homeLink} href="/">
          <span aria-label="Quantile" className={classes.wordmark} role="img" />
        </Link>
        {action}
      </Container>
    </header>
  );
}
