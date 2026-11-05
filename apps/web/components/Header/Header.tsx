import { Container, Group } from "@mantine/core";
import Link from "next/link";
import classes from "./Header.module.css";

export function Header() {
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
        <Group
          component="nav"
          aria-label="Main navigation"
          gap={4}
          wrap="nowrap"
        >
          <Link className={classes.link} href="/newsletter">
            Newsletter
          </Link>
          <Link className={classes.link} href="/consulting">
            Consulting
          </Link>
        </Group>
      </Container>
    </header>
  );
}
