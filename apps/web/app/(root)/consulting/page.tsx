import { Box, Flex, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { LandingPage } from "@/components/LandingPage/LandingPage";
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
        showVideo={false}
        sidebar={
          <Stack gap="md" className={classes.sidebar}>
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
              </div>
            </aside>
            <Stack gap="md" visibleFrom="sm" className={classes.sidebarSignup}>
              <Text
                className={classes.subscribePrompt}
                c="var(--site-text-primary)"
              >
                Subscribe to the <br />
                AI newsletter for data leaders.
              </Text>
              <NewsletterSubscribeForm layout="compact" />
            </Stack>
          </Stack>
        }
        introduction={
          <>
            <span className={classes.introPortrait}>
              <Image
                src="/images/aj-welch.webp"
                alt="Portrait of AJ Welch"
                width={128}
                height={128}
                sizes="64px"
                className={classes.portrait}
              />
              <span className={classes.introPortraitName}>AJ Welch</span>
              <a
                href="mailto:aj@quantile.co"
                className={classes.introPortraitEmail}
              >
                aj@quantile.co
              </a>
            </span>
            <span className={classes.introCopy}>
              Hi, I’m AJ, and I’ve been a software engineer for over 15 years
              at:
            </span>
          </>
        }
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
      </LandingPage>
      <script type="application/ld+json">
        {JSON.stringify(organization).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
