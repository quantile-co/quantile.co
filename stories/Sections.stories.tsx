import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { BookACallSection } from "@/components/BookACallSection/BookACallSection";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
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
        "Fast, flexible, senior data engineering capacity without expensive hires or agency headaches."
      }
      description={
        "Fast, flexible, senior data engineering capacity\nwithout expensive hires or agency headaches."
      }
      signUpHref={signUpHref}
      title={"Fractional\ndata engineering."}
      visual={<HeroAnimation />}
    />
  ),
};

export const Benefits: Story = {
  render: () => <BenefitsSection signUpHref={signUpHref} />,
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
  render: () => <FaqSection signUpHref={signUpHref} />,
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
    await expect(
      await canvas.findByRole("link", { name: "Subscribe" }),
    ).toHaveAttribute("href", signUpHref);

    // Leave the story collapsed for normal browsing and screenshots.
    await userEvent.click(scope);
    await userEvent.click(gettingStarted);
  },
};

export const BookACall: Story = {
  render: () => <BookACallSection calendar={<CalendlyEmbed />} />,
};
