import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SkipLink } from "../components/SkipLink/SkipLink";
import classes from "./layout.module.css";
import Home from "./page";

const meta = {
  title: "Pages/Home",
  component: Home,
  decorators: [
    (Story) => (
      <div className={classes.page}>
        <SkipLink href="#main-content">Skip to content</SkipLink>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Hi, I'm AJ." }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Book a call" }),
    ).toHaveAttribute("href", "https://cal.com/aj-welch/book-a-call");
  },
} satisfies Meta<typeof Home>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
export const MobileDark: Story = {
  globals: { theme: "dark", viewport: { value: "mobile", isRotated: false } },
};
