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
import { readFathomSettings } from "@/lib/env/env";
import { theme } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://quantile.co"),
  title: "Quantile",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Explicit property access lets Next inline deployment-owned build settings.
  const fathom = readFathomSettings({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_FATHOM_SITE_ID: process.env.NEXT_PUBLIC_FATHOM_SITE_ID,
    NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS:
      process.env.NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS,
  });
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto" theme={theme}>
          {children}
        </MantineProvider>
        {fathom && <FathomAnalytics {...fathom} />}
      </body>
    </html>
  );
}
