import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BenefitsAnimationOne } from "@/components/BenefitsAnimation/BenefitsAnimationOne";
import { BenefitsAnimationTwo } from "@/components/BenefitsAnimation/BenefitsAnimationTwo";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";

const meta = {
  title: "Visuals",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 576 }}>
      <HeroAnimation />
    </div>
  ),
};

export const BenefitsOne: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 544, paddingInline: 20 }}>
      <BenefitsAnimationOne />
    </div>
  ),
};

export const BenefitsTwo: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 544, paddingInline: 20 }}>
      <BenefitsAnimationTwo />
    </div>
  ),
};

export const Calendar: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 1108 }}>
      <CalendlyEmbed />
    </div>
  ),
};
