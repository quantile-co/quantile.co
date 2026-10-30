import { IconPlayerPlayFilled } from "@tabler/icons-react";
import type { Metadata } from "next";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";

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

export default function Home() {
  return (
    <>
      <div className={classes.page} id="top">
        <main className={classes.main} id="main-content" tabIndex={-1}>
          <div className={classes.intro}>
            <h1 className={classes.title} id="founder-letter-title">
              AI is transformational. So why is your data team still fighting
              the same fires?
            </h1>
            <section
              aria-label="Video introduction"
              className={classes.videoPlaceholder}
            >
              <span aria-hidden="true" className={classes.videoPlay}>
                <IconPlayerPlayFilled size={28} />
              </span>
              <p>Video coming soon</p>
            </section>
          </div>
          <article
            aria-labelledby="founder-letter-title"
            className={classes.letter}
          >
            <p>
              Hi, I’m AJ, and I’ve been a data engineer for over 15 years at:
            </p>
            <div className={classes.proof}>
              <SocialProofSection ariaLabel="Company experience and client work" />
            </div>
            <p>
              Over the years, I’ve watched the modern data stack change many
              times. On-prem became cloud. ETL became ELT. Batch became
              streaming. Warehouses became lakehouses. The only constant was
              change.
            </p>
            <p>And every change promised to be transformational.</p>
            <p>
              Yet the more things changed, the more they stayed the same. Teams
              faced the same data quality and reliability issues, the same cost
              and performance nightmares, and the same endless stream of ad hoc
              requests and fire drills.
            </p>
            <p>It’s a tale as old as time, and it’s happening again with AI.</p>
            <p>
              Most data engineers already use AI every day. They use it to write
              a query, debug a DAG, or explain someone else’s code. But it
              usually stops there. The pipelines, models, and workflows stay the
              same.
            </p>
            <p>
              It’s not for lack of interest. Your team is in a bind. Fix today’s
              broken pipeline the way you know works, or stop and try something
              new? If the experiment fails, you fall further behind on a backlog
              that’s already too long. So the team keeps firefighting while the
              tools change under its feet.
            </p>
            <p>
              Everyone knows this can’t last. AI is on every data roadmap. But
              it’s nobody’s full-time job, so it never gets built.
            </p>
            <p>
              That’s where I come in. I join your team, find where AI pays off
              in your stack, and build it with you. That might mean agents that
              triage pipeline failures before stakeholders notice, AI-assisted
              dbt development and review, or a way for people to explore company
              data without filing another request.
            </p>
            <p>
              I don’t hand you a strategy deck. I write the code alongside your
              team, then make sure they can run it without me.
            </p>
            <p>
              You work directly with me. Retainers start at{" "}
              <span className={classes.price}>$7k for 40 hours per month.</span>
            </p>
            <p>[Closing invitation]</p>
            <div className={classes.letterClosing}>
              <p className={classes.signature}>
                <span>AJ</span>
                <a href="mailto:aj@quantile.co">aj@quantile.co</a>
              </p>
              <div className={classes.letterAction}>
                <CTAButton />
              </div>
            </div>
          </article>
        </main>
      </div>
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
