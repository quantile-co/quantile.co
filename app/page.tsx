import type { Metadata } from "next";
import { BenefitsAnimationOne } from "@/components/BenefitsAnimation/BenefitsAnimationOne";
import { BenefitsAnimationThree } from "@/components/BenefitsAnimation/BenefitsAnimationThree";
import { BenefitsAnimationTwo } from "@/components/BenefitsAnimation/BenefitsAnimationTwo";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import {
  CheckoutAction,
  CheckoutForm,
} from "@/components/CheckoutForm/CheckoutForm";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import {
  CompactSocialProof,
  SocialProofSection,
} from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";

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

const homeSections = [
  { href: "#benefits", label: "Benefits" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const headerCheckoutActions = {
  desktop: <CheckoutAction size="xs" />,
  mobile: <CheckoutAction size="md" siteCta="section" />,
};

export default function Home() {
  return (
    <div>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <SiteHeader
        bookCallHref="#book-a-call"
        homeHref="#top"
        logo={<BrandLogo />}
        sections={homeSections}
        checkoutActions={headerCheckoutActions}
      />
      <main id="main-content" tabIndex={-1}>
        <HeroSection
          description={heroDescription}
          id="top-hero"
          CheckoutForm={CheckoutForm}
          title={"Fractional data\nand AI engineering"}
          visual={<HeroAnimation />}
        />
        <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
        <BenefitsSection
          CheckoutForm={CheckoutForm}
          onboardingVisual={<BenefitsAnimationOne />}
          expertiseVisual={<BenefitsAnimationTwo />}
          capacityVisual={<BenefitsAnimationThree />}
        />
        <PricingSection
          mobileProof={<SocialProofSection embedded />}
          CheckoutForm={CheckoutForm}
        />
        <SocialProofSection hideOnMobile />
        <FaqSection
          billingPortalLoginUrl={billingPortalLoginUrl}
          compactProof={<CompactSocialProof />}
          CheckoutForm={CheckoutForm}
        />
      </main>
      <SiteFooter
        billingPortalLoginUrl={billingPortalLoginUrl}
        callToAction={<BookACallSection calendar={<CalendlyEmbed />} />}
        homeHref="#top"
        logo={<BrandLogo />}
        sections={homeSections}
        themeSwitcher={<ThemeSwitcher />}
      />
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c")}
      </script>
    </div>
  );
}
