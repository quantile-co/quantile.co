import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { FractionalWorkstream } from "@/components/FractionalWorkstream/FractionalWorkstream";
import { GuaranteeSection } from "@/components/GuaranteeSection/GuaranteeSection";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection/HowItWorksSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { ScopeSection } from "@/components/ScopeSection/ScopeSection";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";

const signUpHref = "https://checkout.stripe.dev/";

const meta = {
  title: "Sections",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  render: () => (
    <HeroSection
      compactDescription={
        "Add senior data engineering capacity\nwithout FTE overhead, agency\nheadaches, or AI slop."
      }
      description={
        "Add senior data engineering capacity without\nFTE overhead, agency headaches, or AI slop."
      }
      signUpHref={signUpHref}
      title={"Fractional\ndata engineering."}
      visual={<FractionalWorkstream />}
    />
  ),
};

export const HowItWorks: Story = {
  render: () => <HowItWorksSection />,
};

export const Scope: Story = {
  render: () => <ScopeSection />,
};

export const Guarantee: Story = {
  render: () => (
    <HeroSection
      description={"Guaranteed code quality.\nTry it for a week."}
      eyebrow="guarantee"
      order={2}
      signUpHref={signUpHref}
      title={"Low\u00a0risk.\nHigh\u00a0Quality."}
      titleSize="section"
    >
      <GuaranteeSection />
    </HeroSection>
  ),
};

export const Benefits: Story = {
  render: () => <BenefitsSection />,
};

export const Pricing: Story = {
  render: () => (
    <PricingSection
      mobileProof={<SocialProofSection embedded />}
      signUpHref={signUpHref}
    />
  ),
};

export const SocialProof: Story = {
  render: () => (
    <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
  ),
};

export const Faq: Story = {
  render: () => <FaqSection />,
};

export const BookACall: Story = {
  render: () => <BookACallSection calendar={<CalendlyEmbed />} />,
};
