import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";

const sections = [
  { href: "#benefits", label: "Benefits" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const previewCheckoutActions = {
  desktop: (
    <form action="/storybook-checkout-preview" method="post">
      <Button autoContrast size="xs" type="submit" variant="filled">
        Start building
      </Button>
    </form>
  ),
  mobile: (
    <form action="/storybook-checkout-preview" method="post">
      <Button
        autoContrast
        data-site-cta="section"
        size="md"
        type="submit"
        variant="filled"
      >
        Start building
      </Button>
    </form>
  ),
};

const meta = {
  title: "Site chrome",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {
  render: () => (
    <div style={{ minHeight: 240 }}>
      <SiteHeader
        bookCallHref="#book-a-call"
        homeHref="#top"
        logo={<BrandLogo />}
        sections={sections}
        checkoutActions={previewCheckoutActions}
      />
    </div>
  ),
};

export const Footer: Story = {
  render: () => (
    <SiteFooter
      billingPortalLoginUrl={billingPortalLoginUrl}
      homeHref="#top"
      logo={<BrandLogo />}
      sections={sections}
      themeSwitcher={<ThemeSwitcher />}
    />
  ),
};

export const Logo: Story = {
  render: () => (
    <div style={{ padding: 32 }}>
      <BrandLogo />
    </div>
  ),
};

export const ThemeControl: Story = {
  render: () => (
    <div style={{ padding: 32 }}>
      <ThemeSwitcher />
    </div>
  ),
};

export const AccessibilitySkipLink: Story = {
  render: () => (
    <div style={{ minHeight: 160, padding: 32 }}>
      <SkipLink href="#story-content">Skip to story content</SkipLink>
      <p id="story-content">Press Tab to reveal and test the skip link.</p>
    </div>
  ),
};
