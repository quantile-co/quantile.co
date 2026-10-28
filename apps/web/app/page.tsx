import type { Metadata } from "next";
import { LetterLandingPage } from "@/components/LetterLandingPage/LetterLandingPage";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import {
  FounderProfile,
  SocialProofSection,
} from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

const pageTitle = "Quantile | Fractional data and AI engineering";
const heroDescription =
  "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.";

export const metadata: Metadata = {
  title: pageTitle,
  description: heroDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: pageTitle,
    description: heroDescription,
    siteName: "Quantile",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: heroDescription,
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Quantile",
  url: "https://quantile.co",
  logo: "https://quantile.co/apple-icon.png",
  description: heroDescription,
  founder: {
    "@type": "Person",
    name: "AJ Welch",
    sameAs: ["https://www.linkedin.com/in/ajwelch4/", "https://x.com/AJWelch"],
  },
};

export default function Home() {
  return (
    <>
      <LetterLandingPage
        skipLink={<SkipLink href="#main-content">Skip to content</SkipLink>}
        socialProof={
          <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
        }
        founderProfile={<FounderProfile />}
        themeSwitcher={<ThemeSwitcher />}
      />
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
