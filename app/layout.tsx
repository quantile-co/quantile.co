import "@fontsource-variable/outfit";
import "./globals.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const metadataTitle = "Quantile | Fractional data engineering";
const metadataDescription =
  "Senior data engineering on subscription. Assign issues, review one active PR per subscription, and pause or cancel anytime.";
const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Quantile",
  url: "https://quantile.co",
  logo: "https://quantile.co/apple-icon.png",
  description: metadataDescription,
  founder: {
    "@type": "Person",
    name: "AJ Welch",
    sameAs: ["https://www.linkedin.com/in/ajwelch4/", "https://x.com/AJWelch"],
  },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://quantile.co"),
  title: metadataTitle,
  description: metadataDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: metadataTitle,
    description: metadataDescription,
    siteName: "Quantile",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description: metadataDescription,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <script type="application/ld+json">
          {JSON.stringify(organizationStructuredData)}
        </script>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
