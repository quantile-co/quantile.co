import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { FractionalWorkstream } from "@/components/FractionalWorkstream/FractionalWorkstream";
import { GuaranteeSection } from "@/components/GuaranteeSection/GuaranteeSection";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection/HowItWorksSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { ScopeSection } from "@/components/ScopeSection/ScopeSection";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

const signUpHref = "https://checkout.stripe.dev/";
const primarySections = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export default function Home() {
  return (
    <div>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <SiteHeader
        bookCallHref="#book-a-call"
        homeHref="#top"
        logo={<BrandLogo />}
        sections={primarySections}
        signUpHref={signUpHref}
      />
      <main id="main-content" tabIndex={-1}>
        <HeroSection
          compactDescription={
            "Add senior data engineering capacity\nwithout FTE overhead, agency\nheadaches, or AI slop."
          }
          description={
            "Add senior data engineering capacity without\nFTE overhead, agency headaches, or AI slop."
          }
          id="top-hero"
          signUpHref={signUpHref}
          title={"Fractional\ndata engineering."}
          visual={<FractionalWorkstream />}
        />
        <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
        <HowItWorksSection />
        <ScopeSection />
        <HeroSection
          description={"Guaranteed code quality.\nTry it for a week."}
          eyebrow="guarantee"
          id="guarantee"
          order={2}
          signUpHref={signUpHref}
          title={"Low\u00a0risk.\nHigh\u00a0Quality."}
          titleSize="section"
        >
          <GuaranteeSection />
        </HeroSection>
        <BenefitsSection />
        <PricingSection
          mobileProof={<SocialProofSection embedded />}
          signUpHref={signUpHref}
        />
        <SocialProofSection hideOnMobile />
        <FaqSection />
      </main>
      <SiteFooter
        callToAction={<BookACallSection calendar={<CalendlyEmbed />} />}
        homeHref="#top"
        logo={<BrandLogo />}
        sections={primarySections}
        themeSwitcher={<ThemeSwitcher />}
      />
    </div>
  );
}
