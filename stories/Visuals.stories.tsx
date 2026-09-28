import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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

export const Calendar: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 1108 }}>
      <CalendlyEmbed />
    </div>
  ),
};
