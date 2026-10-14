import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { BenefitsAnimation1 } from "@/components/BenefitsAnimation/BenefitsAnimation1";
import { BenefitsAnimation2 } from "@/components/BenefitsAnimation/BenefitsAnimation2";
import { BenefitsAnimation3 } from "@/components/BenefitsAnimation/BenefitsAnimation3";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import {
  CompactSocialProof,
  SocialProofSection,
} from "@/components/SocialProofSection/SocialProofSection";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";

const previewCheckoutAction = "/storybook-checkout-preview";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return (
    <form action={previewCheckoutAction} method="post">
      {children}
    </form>
  );
}

const meta = {
  title: "Sections",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  render: () => (
    <HeroSection
      description="Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches."
      CheckoutForm={PreviewCheckoutForm}
      title={"Fractional data\nand AI engineering"}
      visual={<HeroAnimation />}
    />
  ),
};

export const Benefits: Story = {
  render: () => (
    <BenefitsSection
      CheckoutForm={PreviewCheckoutForm}
      onboardingVisual={<BenefitsAnimation1 />}
      expertiseVisual={<BenefitsAnimation2 />}
      capacityVisual={<BenefitsAnimation3 />}
    />
  ),
};

export const Pricing: Story = {
  render: () => (
    <PricingSection
      mobileProof={<SocialProofSection embedded />}
      CheckoutForm={PreviewCheckoutForm}
    />
  ),
};

export const SocialProof: Story = {
  render: () => (
    <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
  ),
};

export const Faq: Story = {
  render: () => (
    <FaqSection
      billingPortalLoginUrl={billingPortalLoginUrl}
      compactProof={<CompactSocialProof />}
      CheckoutForm={PreviewCheckoutForm}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const questions = canvas.getAllByRole("button");
    await expect(questions).toHaveLength(18);
    await expect(questions[0]).toHaveTextContent("Who works on my issues?");
    await expect(questions[17]).toHaveTextContent("How do I get started?");

    const scope = canvas.getByRole("button", {
      name: "What kinds of issues can I assign?",
    });
    await userEvent.click(scope);
    await expect(scope).toHaveAttribute("aria-expanded", "true");
    const scopeList = await canvas.findByRole("list");
    await expect(within(scopeList).getAllByRole("listitem")).toHaveLength(8);
    await expect(scopeList.querySelectorAll("strong")).toHaveLength(8);
    await expect(scopeList).toHaveTextContent("GCP Dataplex");

    await userEvent.click(scope);
    await expect(scope).toHaveAttribute("aria-expanded", "false");
    scope.focus();
    await userEvent.keyboard("{Enter}");
    await expect(scope).toHaveAttribute("aria-expanded", "true");

    const gettingStarted = canvas.getByRole("button", {
      name: "How do I get started?",
    });
    await userEvent.click(gettingStarted);
    const subscribe = await canvas.findByRole("button", { name: "Subscribe" });
    await expect(subscribe.closest("form")).toHaveAttribute(
      "action",
      previewCheckoutAction,
    );

    // Leave the story collapsed for normal browsing and screenshots.
    await userEvent.click(scope);
    await userEvent.click(gettingStarted);
  },
};

export const BookACall: Story = {
  render: () => <BookACallSection calendar={<CalendlyEmbed />} />,
};
