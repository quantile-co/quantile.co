import { Box, Flex, Stack, Text } from "@mantine/core";
import type { Metadata } from "next";
import Image from "next/image";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { LandingPage } from "@/components/LandingPage/LandingPage";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";
import classes from "./page.module.css";

const pageTitle = "Quantile | Fractional data and AI engineering";
const heroDescription =
  "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.";

export const metadata: Metadata = {
  title: pageTitle,
  description: heroDescription,
  alternates: { canonical: "/consulting" },
  openGraph: {
    title: pageTitle,
    description: heroDescription,
    siteName: "Quantile",
    type: "website",
    url: "/consulting",
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

export default function ConsultingPage() {
  return (
    <>
      <LandingPage
        showVideo={false}
        sidebar={
          <Stack gap="xl">
            <aside aria-label="About AJ Welch" className={classes.profile}>
              <div className={classes.portraitFrame}>
                <Image
                  src="/images/aj-welch.webp"
                  alt="Portrait of AJ Welch"
                  fill
                  sizes="(max-width: 47.9375em) 88px, (max-width: 75em) 22vw, 224px"
                  className={classes.portrait}
                />
              </div>
              <div className={classes.profileText}>
                <div className={classes.identity}>
                  <Text className={classes.name}>AJ Welch</Text>
                  <a href="mailto:aj@quantile.co" className={classes.email}>
                    aj@quantile.co
                  </a>
                </div>
                <Text className={classes.experience}>
                  15+ years experience at Google, CompilerWorks, and Chartio.
                </Text>
              </div>
            </aside>
            <Stack gap="md" visibleFrom="sm">
              <Text size="lg" c="var(--site-text-primary)">
                Subscribe to the AI newsletter for data leaders.
              </Text>
              <NewsletterSubscribeForm layout="compact" />
            </Stack>
          </Stack>
        }
        introduction="Hi, I’m AJ, and I’ve been a software engineer for over 15 years at:"
        proof={
          <SocialProofSection ariaLabel="Company experience and client work" />
        }
        action={<CTAButton />}
        newsletterForm={
          <Flex hiddenFrom="sm" w="80%" maw="35ch" justify="center">
            <NewsletterSubscribeForm layout="compact" />
          </Flex>
        }
        postscript={
          <>
            <Box component="span" hiddenFrom="sm">
              P.S. Subscribe to the AI newsletter for data leaders below.
            </Box>
            <Box component="span" visibleFrom="sm">
              P.S. Subscribe to the AI newsletter for data leaders in the
              sidebar or{" "}
              <a
                href="/newsletter"
                aria-label="Subscribe to the newsletter here"
              >
                here
              </a>
              .
            </Box>
          </>
        }
      >
        <p>I’ve watched the modern data stack change many times:</p>
        <ul>
          <li>On-prem became cloud</li>
          <li>ETL became ELT</li>
          <li>Batch became streaming</li>
          <li>Warehouses became lakehouses</li>
          <li>Business logic became the semantic layer</li>
        </ul>
        <p>Each change promised to be transformational.</p>
        <p>Yet the data team was always left with the same challenges:</p>
        <ul>
          <li>Poor data quality and unreliable pipelines</li>
          <li>Failed self-serve tools and endless ad hoc requests</li>
          <li>Growing governance and security requirements</li>
          <li>Rising platform costs and suboptimal performance</li>
          <li>Limited time and resources for new capabilities</li>
        </ul>
        <p>It’s a tale as old as time, and it’s happening again with AI.</p>
        <p>
          Most data engineers already use AI every day. They use it to write a
          query, debug a DAG, or explain someone else’s code. But it usually
          stops there. The pipelines, models, and workflows stay the same.
        </p>
        <p>
          It’s not for lack of interest. Your team is in a bind. Fix today’s
          broken pipeline the way you know works, or stop and try something new?
          If the experiment fails, you fall further behind on a backlog that’s
          already too long. So the team keeps firefighting while the tools
          change under its feet.
        </p>
        <p>
          Everyone knows this can’t last. AI is on every data roadmap. But it’s
          nobody’s full-time job, so it never gets built.
        </p>
        <p>
          That’s where I come in. I join your team, find where AI pays off in
          your stack, and build it with you. That might mean agents that triage
          pipeline failures before stakeholders notice, AI-assisted dbt
          development and review, or a way for people to explore company data
          without filing another request.
        </p>
        <p>
          I don’t hand you a strategy deck. I write the code alongside your
          team, then make sure they can run it without me.
        </p>
        <p>
          You work directly with me. Retainers start at{" "}
          <strong>$7k for 40 hours per month.</strong>
        </p>
        <p>[Closing invitation]</p>
      </LandingPage>
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
