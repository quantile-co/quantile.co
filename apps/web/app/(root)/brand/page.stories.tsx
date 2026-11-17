import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SkipLink } from "../../../components/SkipLink/SkipLink";
import classes from "../../layout.module.css";
import SiteLayout from "../layout";
import BrandPage from "./page";

const meta = {
  title: "Pages/Brand",
  component: BrandPage,
  decorators: [
    (Story) => (
      <div className={classes.page}>
        <SkipLink href="#main-content">Skip to content</SkipLink>
        <SiteLayout>
          <Story />
        </SiteLayout>
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Brand assets" }),
    ).toBeVisible();
    await expect(
      canvas
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("download")),
    ).toHaveLength(10);
  },
} satisfies Meta<typeof BrandPage>;
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
