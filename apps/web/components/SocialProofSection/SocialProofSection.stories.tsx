import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SocialProofSection } from "./SocialProofSection";

const meta = {
  title: "Components/SocialProofSection",
  component: SocialProofSection,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("article")).toHaveLength(3);
    await expect(canvas.getByText("Google", { exact: true })).toBeVisible();
  },
} satisfies Meta<typeof SocialProofSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
