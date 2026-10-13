import "@fontsource-variable/outfit";
import "./globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { theme } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://quantile.co"),
  title: "Quantile",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto" theme={theme}>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
