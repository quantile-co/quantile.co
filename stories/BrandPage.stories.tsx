import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BrandPage from "../app/brand/page";

const meta = {
  title: "Pages/Brand assets",
  component: BrandPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BrandPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = {
  globals: { theme: "dark" },
};
