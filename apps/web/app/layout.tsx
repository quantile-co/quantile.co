import "@fontsource-variable/outfit";
import "./globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FathomAnalytics } from "@/components/FathomAnalytics/FathomAnalytics";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { site } from "@/lib/metadata";
import classes from "./layout.module.css";
import { theme } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
};

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
            {children}
          </div>
        </MantineProvider>
        <FathomAnalytics />
      </body>
    </html>
  );
}
