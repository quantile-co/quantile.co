import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SkipLink } from "./SkipLink";

const meta = {
  title: "Components/SkipLink",
  component: SkipLink,
  args: { href: "#main-content", children: "Skip to content" },
  decorators: [
    (Story) => (
      <>
        <Story />
        <main id="main-content" tabIndex={-1}>
          Main content target
        </main>
      </>
    ),
  ],
} satisfies Meta<typeof SkipLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const KeyboardFocus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(
      canvas.getByRole("link", { name: "Skip to content" }),
    ).toHaveFocus();
  },
};
// Fragment navigation is exercised against the built Storybook: Vitest serves
// stories under a different base URL, where a real navigation leaves its runner.
export const Activated: Story = {
  tags: ["!test"],
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("main")).toHaveFocus();
  },
};
