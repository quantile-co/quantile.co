import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BenefitsAnimation1 } from "@/components/BenefitsAnimation/BenefitsAnimation1";
import { BenefitsAnimation2 } from "@/components/BenefitsAnimation/BenefitsAnimation2";
import { BenefitsAnimation3 } from "@/components/BenefitsAnimation/BenefitsAnimation3";
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

export const Benefits1: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 544, paddingInline: 20 }}>
      <BenefitsAnimation1 />
    </div>
  ),
};

export const Benefits2: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 544, paddingInline: 20 }}>
      <BenefitsAnimation2 />
    </div>
  ),
};

export const Benefits3: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 544, paddingInline: 20 }}>
      <BenefitsAnimation3 />
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
