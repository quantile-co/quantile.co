import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LandingPage } from "./LandingPage";

const meta = {
  title: "Components/LandingPage",
  component: LandingPage,
  args: {
    containerProps: { size: 800, px: "var(--site-page-padding)" },
    heading: <h1 id="founder-letter-title">Layout specimen</h1>,
    introduction: "A representative introduction for this component specimen.",
    proof: <p>Example proof slot</p>,
    action: <a href="#example">Example action slot</a>,
    children: (
      <p>The current production copy is exercised separately in Pages/Home.</p>
    ),
  },
} satisfies Meta<typeof LandingPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const LongContent: Story = {
  args: {
    children: Array.from(
      { length: 12 },
      (_, index) => `paragraph-${index}`,
    ).map((id) => (
      <p key={id}>
        Representative long content exercises wrapping, vertical scrolling and
        the closing action without changing production copy.
      </p>
    )),
  },
};
