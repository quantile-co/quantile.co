import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Header } from "./Header";

const meta = {
  title: "Components/Header",
  component: Header,
  // Full production CTA composition is covered in Pages/Brand and Pages/Not found.
  args: { action: <a href="#example">Example action slot</a> },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Quantile home" }),
    ).toHaveAttribute("href", "/");
  },
} satisfies Meta<typeof Header>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
