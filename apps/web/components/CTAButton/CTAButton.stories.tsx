import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CTAButton } from "./CTAButton";

const meta = {
  title: "Components/CTAButton",
  component: CTAButton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CTAButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("link", { name: "Book a call" }));
  },
};
export const KeyboardFocus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(
      canvas.getByRole("link", { name: "Book a call" }),
    ).toHaveFocus();
  },
};
