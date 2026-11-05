"use client";

import { Container, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./Header.module.css";

export function Header() {
  const pathname = usePathname();

  return (
    <header className={classes.header}>
      <Container
        size="xl"
        px="var(--site-page-padding)"
        className={classes.inner}
      >
        <Link
          aria-label="Quantile home"
          aria-current={pathname === "/" ? "page" : undefined}
          className={classes.homeLink}
          href="/"
        >
          <span aria-label="Quantile" className={classes.wordmark} role="img" />
        </Link>
        <Group
          component="nav"
          aria-label="Main navigation"
          gap={4}
          wrap="nowrap"
        >
          <Link
            className={classes.link}
            href="/newsletter"
            aria-current={pathname === "/newsletter" ? "page" : undefined}
          >
            Newsletter
          </Link>
          <Link
            className={classes.link}
            href="/consulting"
            aria-current={pathname === "/consulting" ? "page" : undefined}
          >
            Consulting
          </Link>
        </Group>
      </Container>
    </header>
  );
}
