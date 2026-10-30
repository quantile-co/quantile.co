import "@fontsource-variable/outfit";
import "./globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { FathomAnalytics } from "@/components/FathomAnalytics/FathomAnalytics";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import classes from "./layout.module.css";
import { theme } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://quantile.co"),
  title: "Quantile",
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
            <header className={classes.header}>
              <div className={classes.headerInner}>
                <HomeLink />
                <CTAButton />
              </div>
            </header>
            <div className={classes.content}>{children}</div>
            <footer className={classes.footer}>
              <div aria-hidden="true" className={classes.divider}>
                <span className={classes.outerLeft} />
                <span className={classes.slopeLeft} />
                <span className={classes.innerLine} />
                <span className={classes.slopeRight} />
                <span className={classes.outerRight} />
              </div>
              <div className={classes.footerInner}>
                <HomeLink />
                <p className={classes.copyright}>
                  © {new Date().getFullYear()} Quantile LLC
                </p>
                <div className={classes.theme}>
                  <ThemeSwitcher />
                </div>
              </div>
            </footer>
          </div>
        </MantineProvider>
        <FathomAnalytics />
      </body>
    </html>
  );
}
