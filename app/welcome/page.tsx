import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo/BrandLogo";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import classes from "./page.module.css";

export const metadata: Metadata = {
  title: "Thanks for subscribing | Quantile",
  robots: { index: false, follow: false },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ sandbox?: string | string[] }>;
}) {
  // This hint changes copy only. A return URL is never proof of payment or
  // email delivery; only the verified paid-invoice webhook handles fulfillment.
  const sandbox = (await searchParams).sandbox === "1";
  return (
    <div className={classes.page}>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <header className={classes.header}>
        <a aria-label="Quantile homepage" href="/">
          <BrandLogo />
        </a>
      </header>
      <main className={classes.main} id="main-content" tabIndex={-1}>
        <p className={classes.label}>Checkout complete</p>
        <h1 className={classes.title}>Thanks for subscribing.</h1>
        <p className={classes.message}>
          We’re confirming your payment. Once it’s confirmed, we’ll send a
          welcome email with next steps.
        </p>
        {sandbox && (
          <p className={classes.sandbox}>
            This is a Sandbox purchase. The test welcome email goes to Resend’s
            simulator, not the address entered at Checkout.
          </p>
        )}
        <a className={classes.home} href="/">
          Back to Quantile
        </a>
      </main>
    </div>
  );
}
