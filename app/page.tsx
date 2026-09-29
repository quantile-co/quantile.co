import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

const signUpHref = "https://checkout.stripe.dev/";
const primarySections = [
  { href: "#benefits", label: "Benefits" },
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
            "Fast, flexible, senior data engineering capacity without expensive hires or agency headaches."
          }
          description={
            "Fast, flexible, senior data engineering capacity\nwithout expensive hires or agency headaches."
          }
          id="top-hero"
          signUpHref={signUpHref}
          title={"Fractional\ndata engineering."}
          visual={<HeroAnimation />}
        />
        <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
        <BenefitsSection signUpHref={signUpHref} />
        <PricingSection
          mobileProof={<SocialProofSection embedded />}
          signUpHref={signUpHref}
        />
        <SocialProofSection hideOnMobile />
        <FaqSection signUpHref={signUpHref} />
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
