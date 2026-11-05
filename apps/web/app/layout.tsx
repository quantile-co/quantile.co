import "@fontsource-variable/outfit";
import "./globals.css";
import {
  ColorSchemeScript,
  Container,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FathomAnalytics } from "@/components/FathomAnalytics/FathomAnalytics";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { site } from "@/lib/metadata";
import classes from "./layout.module.css";
import { theme } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
};

function HomeLink() {
  return (
    <a aria-label="Quantile home" className={classes.homeLink} href="/">
      <span aria-label="Quantile" className={classes.wordmark} role="img" />
    </a>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto" theme={theme}>
          <div className={classes.page}>
            <SkipLink href="#main-content">Skip to content</SkipLink>
            <div className={classes.content}>{children}</div>
            <Container
              component="footer"
              fluid
              px={0}
              className={classes.footer}
            >
              <div aria-hidden="true" className={classes.divider}>
                <span className={classes.outerLeft} />
                <span className={classes.slopeLeft} />
                <span className={classes.innerLine} />
                <span className={classes.slopeRight} />
                <span className={classes.outerRight} />
              </div>
              <Container
                size="xl"
                px="var(--site-page-padding)"
                className={classes.footerInner}
              >
                <HomeLink />
                <p className={classes.copyright}>
                  © {new Date().getFullYear()} Quantile LLC
                </p>
                <div className={classes.theme}>
                  <ThemeSwitcher />
                </div>
              </Container>
            </Container>
          </div>
        </MantineProvider>
        <FathomAnalytics />
      </body>
    </html>
  );
}
