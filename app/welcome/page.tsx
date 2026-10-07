import type { Metadata } from "next";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

const primarySections = [
  { href: "/#benefits", label: "Benefits" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const metadata: Metadata = {
  title: "Welcome | Quantile",
  robots: { index: false, follow: false },
};

// This page is a friendly return from Checkout, never proof of fulfillment.
// The verified paid-invoice webhook alone sends the welcome email.
export default function WelcomePage() {
  return (
    <div>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <SiteHeader
        bookCallHref="#book-a-call"
        homeHref="/"
        logo={<BrandLogo />}
        sections={primarySections}
        signUpFormId="subscription-checkout"
      />
      <main id="main-content" tabIndex={-1}>
        <BookACallSection
          calendar={<CalendlyEmbed />}
          description={
            "Keep an eye out for a welcome email with next steps, or feel free to book an intro call below."
          }
          headingLevel={1}
          title="Thanks for subscribing."
        />
      </main>
      <SiteFooter
        homeHref="/"
        logo={<BrandLogo />}
        sections={primarySections}
        themeSwitcher={<ThemeSwitcher />}
      />
    </div>
  );
}
