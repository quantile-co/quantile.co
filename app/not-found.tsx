import { IconArrowRight } from "@tabler/icons-react";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";
import classes from "./not-found.module.css";

const sections = [
  { href: "/#benefits", label: "Benefits" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export default function NotFound() {
  return (
    <div className={classes.page}>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <SiteHeader
        bookCallHref="/#book-a-call"
        homeHref="/"
        logo={<BrandLogo />}
        sections={sections}
        signUpFormId="subscription-checkout"
      />
      <main className={classes.main} id="main-content" tabIndex={-1}>
        <div className={classes.content}>
          <p className={classes.code}>404</p>
          <h1 className={classes.title}>Page not found.</h1>
          <p className={classes.description}>
            We couldn’t find that page. Let&apos;s get you back home.
          </p>
          <a className={classes.homeLink} href="/">
            Back to home <IconArrowRight aria-hidden="true" size={18} />
          </a>
        </div>
      </main>
      <SiteFooter
        billingPortalLoginUrl={billingPortalLoginUrl}
        homeHref="/"
        logo={<BrandLogo />}
        sections={sections}
        themeSwitcher={<ThemeSwitcher />}
      />
    </div>
  );
}
