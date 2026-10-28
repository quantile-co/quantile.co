import { Button } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { Metadata } from "next";
import { SkipLink } from "@/components/SkipLink/SkipLink";
import {
  FounderProfile,
  SocialProofSection,
} from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";

import classes from "./page.module.css";

const pageTitle = "Quantile | Fractional data and AI engineering";
const heroDescription =
  "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.";

export const metadata: Metadata = {
  title: pageTitle,
  description: heroDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: pageTitle,
    description: heroDescription,
    siteName: "Quantile",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: heroDescription,
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Quantile",
  url: "https://quantile.co",
  logo: "https://quantile.co/apple-icon.png",
  description: heroDescription,
  founder: {
    "@type": "Person",
    name: "AJ Welch",
    sameAs: ["https://www.linkedin.com/in/ajwelch4/", "https://x.com/AJWelch"],
  },
};

function ContactActions({ className = "" }: { className?: string }) {
  return (
    <div className={`${classes.contactActions} ${className}`}>
      <Button
        aria-label="Let’s talk — book a call"
        autoContrast
        className={classes.callToAction}
        classNames={{ section: classes.callToActionSection }}
        component="a"
        data-site-cta="letter"
        href="https://cal.com/aj-welch/book-a-call"
        target="_blank"
        rel="noopener noreferrer"
        rightSection={<IconArrowUpRight aria-hidden="true" size={24} />}
        size="xl"
        variant="filled"
      >
        Let’s talk
      </Button>
      <p className={classes.email}>
        <a href="mailto:aj@quantile.co">aj@quantile.co</a>
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <div className={classes.page} id="top">
        <SkipLink href="#main-content">Skip to content</SkipLink>
        <main id="main-content" tabIndex={-1}>
          <div className={classes.intro}>
            <h1 className={classes.title} id="founder-letter-title">
              <span className={classes.titleTransform}>Transform</span>{" "}
              <span className={classes.titleTeam}>
                your
                <br className={classes.desktopBreak} /> data team
              </span>{" "}
              <span className={classes.titleAI}>with AI.</span>
            </h1>
            <div className={classes.proof}>
              <SocialProofSection ariaLabel="AJ Welch's experience and client work" />
            </div>
            <div className={classes.headingContact}>
              <ContactActions />
            </div>
          </div>
          <article
            aria-labelledby="founder-letter-title"
            className={classes.letter}
          >
            {/* Original placeholder copy for this local design exploration. */}
            <p>Hey, I’m AJ.</p>
            <p>
              You have a product to build. But somewhere along the way, the data
              work became a job of its own.
            </p>
            <p>
              Pipelines. Infrastructure. Analytics. AI. Getting it all working
              together takes time away from the thing you set out to build.
            </p>
            <p>
              That’s where I come in. I’m a data and AI engineer with 15+ years
              of experience at Google, CompilerWorks, and Chartio. Quantile is
              how I bring that experience to your team, without another
              full-time hire.
            </p>
            <p>
              We’ll figure out what matters, roll up our sleeves, and build it.
              You work directly with me—from the first conversation to the code
              that ships.
            </p>
            <p>
              A little help getting unstuck. An experienced pair of hands for
              something new. Someone who cares about the details, so you can
              focus on your product.
            </p>
            <p>
              If that sounds useful, we can start at{" "}
              <span className={classes.price}>$6k · 40hrs / month.</span>
            </p>
          </article>
        </main>
        <footer className={classes.footer}>
          <div className={classes.founderProfile}>
            <FounderProfile />
          </div>
          <ContactActions className={classes.contact} />
          <ThemeSwitcher />
        </footer>
      </div>
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
