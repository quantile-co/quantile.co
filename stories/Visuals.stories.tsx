import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendlyEmbed } from "@/components/CalendlyEmbed/CalendlyEmbed";
import { FractionalWorkstream } from "@/components/FractionalWorkstream/FractionalWorkstream";

const meta = {
  title: "Visuals",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FractionalDelivery: Story = {
  render: () => (
    <div style={{ margin: "48px auto", maxWidth: 576 }}>
      <FractionalWorkstream />
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
