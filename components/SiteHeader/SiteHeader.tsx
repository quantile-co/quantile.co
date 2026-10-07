"use client";

import {
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import classes from "./SiteHeader.module.css";

type SiteHeaderProps = {
  bookCallHref: string;
  homeHref: string;
  logo: ReactNode;
  sections: ReadonlyArray<{ href: string; label: string }>;
  signUpFormId: string;
};

export function SiteHeader({
  bookCallHref,
  homeHref,
  logo,
  sections,
  signUpFormId,
}: SiteHeaderProps) {
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = sections.map((section) => (
    <a
      className={classes.link}
      href={section.href}
      key={section.href}
      onClick={close}
    >
      {section.label}
    </a>
  ));

  return (
    <header className={classes.header}>
      <Container className={classes.inner} size="xl">
        <a aria-label="Quantile home" href={homeHref}>
          {logo}
        </a>

        <Group gap="sm" visibleFrom="lg">
          <nav aria-label="Primary">
            <Group gap={4}>{items}</Group>
          </nav>
          <Group gap="xs">
            <Button
              className={classes.navButton}
              component="a"
              href={bookCallHref}
              size="xs"
              variant="outline"
            >
              Book a call
            </Button>
            <Button
              autoContrast
              className={classes.navButton}
              form={signUpFormId}
              size="xs"
              type="submit"
              variant="filled"
            >
              Start building
            </Button>
          </Group>
        </Group>

        <Group gap="xs" hiddenFrom="lg">
          <Burger
            aria-controls="mobile-navigation-drawer"
            aria-expanded={opened}
            aria-label="Toggle navigation"
            onClick={toggle}
            opened={opened}
            size="sm"
          />
        </Group>
      </Container>

      <Drawer
        closeButtonProps={{ "aria-label": "Close navigation" }}
        classNames={{
          close: classes.drawerClose,
          title: classes.drawerTitle,
        }}
        hiddenFrom="lg"
        id="mobile-navigation-drawer"
        onClose={close}
        opened={opened}
        padding="md"
        size="100%"
        title={
          <UnstyledButton
            aria-label="Quantile home"
            component="a"
            href={homeHref}
            onClick={close}
          >
            {logo}
          </UnstyledButton>
        }
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          <div className={classes.drawerContent}>
            <nav aria-label="Primary" className={classes.mobileNav}>
              {items}
            </nav>
            <Stack className={classes.mobileActions} gap="sm">
              <Button
                component="a"
                data-site-cta="section"
                href={bookCallHref}
                onClick={close}
                size="md"
                variant="outline"
              >
                Book a call
              </Button>
              <Button
                autoContrast
                data-site-cta="section"
                form={signUpFormId}
                onClick={close}
                size="md"
                type="submit"
                variant="filled"
              >
                Start building
              </Button>
            </Stack>
          </div>
        </ScrollArea>
      </Drawer>
    </header>
  );
}
