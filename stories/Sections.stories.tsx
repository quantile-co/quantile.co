import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection/HowItWorksSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
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
        "Add senior data engineering capacity\nwithout FTE overhead, agency\nheadaches, or AI guesswork."
      }
      description={
        "Add senior data engineering capacity without\nFTE overhead, agency headaches, or AI guesswork."
      }
      signUpHref={signUpHref}
      title={"Fractional\ndata engineering."}
      visual={<HeroAnimation />}
    />
  ),
};

export const HowItWorks: Story = {
  render: () => <HowItWorksSection />,
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
