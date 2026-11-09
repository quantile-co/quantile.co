import { Title } from "@mantine/core";
import Image from "next/image";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { LandingPage } from "@/components/LandingPage/LandingPage";
import { NewsletterSubscribeFooter } from "@/components/NewsletterSubscribeFooter/NewsletterSubscribeFooter";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";
import { createPageMetadata, organization } from "@/lib/metadata";
import classes from "./page.module.css";

const pageTitle = "Data & AI Engineering Consulting";
const heroDescription =
  "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.";

export const metadata = createPageMetadata({
  title: pageTitle,
  description: heroDescription,
  pathname: "/consulting",
});

export default function ConsultingPage() {
  return (
    <>
      <LandingPage
        className={classes.page}
        containerProps={{ size: 800, px: "var(--site-page-padding)" }}
        showVideo={false}
        heading={
          <header className={classes.heading}>
            <span className={classes.portraitRow}>
              <Image
                src="/images/contributors/aj-welch.webp"
                alt="Portrait of AJ Welch"
                width={128}
                height={128}
                sizes="(max-width: 50em) 64px, (max-width: 75em) 8vw, 96px"
                className={classes.portrait}
              />
            </span>
            <Title order={1} id="founder-letter-title">
              Hi, I'm AJ.
            </Title>
          </header>
        }
        introduction="I've been a software and data engineer for over 15 years at:"
        proof={
          <SocialProofSection ariaLabel="Company experience and client work" />
        }
        action={<CTAButton />}
        newsletterFooter={
          <NewsletterSubscribeFooter
            titleId="consulting-subscribe-title"
            form={
              <NewsletterSubscribeForm
                layout="compact"
                buttonProps={{ children: "Subscribe" }}
              />
            }
          />
        }
      >
        <p>
          Nowadays, I work with small data teams at companies under 500 people.
          In particular, I've been helping teams use{" "}
          <a href="https://dspy.ai/" target="_blank" rel="noopener noreferrer">
            DSPy
          </a>{" "}
          and{" "}
          <a
            href="https://gepa-ai.github.io/gepa/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GEPA
          </a>{" "}
          to optimize both the AI layer and the data platform beneath it.
        </p>
        <p>More broadly, I focus on:</p>
        <div className={classes.bulletColumns}>
          <section aria-labelledby="ai-services-title">
            <h2 id="ai-services-title">AI</h2>
            <ul>
              <li>Agents, workflows and automation</li>
              <li>Context engineering and RAG</li>
              <li>Optimization and fine-tuning</li>
              <li>Evals and dataset engineering</li>
              <li>Observability, guardrails and cost control</li>
            </ul>
          </section>
          <section aria-labelledby="data-services-title">
            <h2 id="data-services-title">Data</h2>
            <ul>
              <li>Semantic layer modeling and analytics</li>
              <li>Pipeline orchestration and ELT/ETL</li>
              <li>Ingestion, integration and streaming</li>
              <li>Performance and cost optimization</li>
              <li>Observability, quality and governance</li>
            </ul>
          </section>
        </div>
        <p>
          If you're interested in working together, please feel free to email me
          or book a call. Retainers start at $15k for 80 hours a month.
        </p>
      </LandingPage>
      <script type="application/ld+json">
        {JSON.stringify(organization).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
