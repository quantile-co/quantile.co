import { Button } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./LetterLandingPage.module.css";
import { ScrollThemeControl } from "./ScrollThemeControl";

type LetterLandingPageProps = {
  skipLink: ReactNode;
  socialProof: ReactNode;
  founderProfile: ReactNode;
  themeSwitcher: ReactNode;
};

export function LetterLandingPage({
  skipLink,
  socialProof,
  founderProfile,
  themeSwitcher,
}: LetterLandingPageProps) {
  return (
    <div className={classes.page} id="top">
      {skipLink}
      <main id="main-content" tabIndex={-1}>
        <div className={classes.proof}>{socialProof}</div>
        <article
          aria-labelledby="founder-letter-title"
          className={classes.letter}
        >
          {/* Original placeholder copy for this local design exploration. */}
          <h1 id="founder-letter-title">Your data shouldn’t slow you down.</h1>
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
            That’s where I come in. I’m a data and AI engineer with 15+ years of
            experience at Google, CompilerWorks, and Chartio. Quantile is how I
            bring that experience to your team, without another full-time hire.
          </p>
          <p>
            We’ll figure out what matters, roll up our sleeves, and build it.
            You work directly with me—from the first conversation to the code
            that ships.
          </p>
          <p>
            A little help getting unstuck. An experienced pair of hands for
            something new. Someone who cares about the details, so you can focus
            on your product.
          </p>
          <p>
            If that sounds useful, we can start at{" "}
            <span className={classes.price}>$6k · 40hrs / month.</span>
          </p>
        </article>
      </main>
      <footer className={classes.footer}>
        <div className={classes.founderProfile}>{founderProfile}</div>
        <div className={classes.contact}>
          <Button
            aria-label="Let’s talk — book a call"
            autoContrast
            className={classes.callToAction}
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
            Prefer email? <a href="mailto:aj@quantile.co">aj@quantile.co</a>
          </p>
        </div>
        <ScrollThemeControl>{themeSwitcher}</ScrollThemeControl>
      </footer>
    </div>
  );
}
