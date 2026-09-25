import { Container, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./SiteFooter.module.css";

type SiteFooterProps = {
  callToAction?: ReactNode;
  homeHref: string;
  logo: ReactNode;
  sections: ReadonlyArray<{ href: string; label: string }>;
  themeSwitcher: ReactNode;
};

export function SiteFooter({
  callToAction,
  homeHref,
  logo,
  sections,
  themeSwitcher,
}: SiteFooterProps) {
  const items = sections.map((section) => (
    <a className={classes.link} href={section.href} key={section.href}>
      {section.label}
    </a>
  ));

  return (
    <footer className={classes.footer}>
      <div aria-hidden="true" className={classes.divider}>
        <span className={classes.outerLeft} />
        <span className={classes.slopeLeft} />
        <span className={classes.innerLine} />
        <span className={classes.slopeRight} />
        <span className={classes.outerRight} />
      </div>
      {callToAction}
      <Container className={classes.inner} size="xl">
        <a aria-label="Quantile home" href={homeHref}>
          {logo}
        </a>
        <Text className={classes.copyright}>
          © {new Date().getFullYear()} Quantile LLC
        </Text>
        <Group className={classes.actions} gap="md">
          <Group
            aria-label="Footer"
            className={classes.links}
            component="nav"
            gap="md"
          >
            {items}
          </Group>
          {themeSwitcher}
        </Group>
      </Container>
    </footer>
  );
}
