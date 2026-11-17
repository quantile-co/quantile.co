import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SkipLink } from "../components/SkipLink/SkipLink";
import classes from "./layout.module.css";
import NotFound from "./not-found";

const meta = {
  title: "Pages/Not found",
  component: NotFound,
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
      canvas.getByRole("heading", { name: "Page not found." }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/");
  },
} satisfies Meta<typeof NotFound>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
