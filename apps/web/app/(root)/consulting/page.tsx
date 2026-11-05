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
                  sizes="(max-width: 48em) 170px, (max-width: 75em) 22vw, 224px"
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
            <Stack gap="md" visibleFrom="xs" className={classes.sidebarSignup}>
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
          <Flex hiddenFrom="xs" w="80%" maw="35ch" justify="center">
            <NewsletterSubscribeForm layout="compact" />
          </Flex>
        }
        postscript={
          <>
            <Box component="span" hiddenFrom="xs">
              P.S. Subscribe to the AI newsletter for data leaders below.
            </Box>
            <Box component="span" visibleFrom="xs">
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
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <div className={classes.bulletColumns}>
          <ul>
            <li>Lorem ipsum dolor sit amet</li>
            <li>Consectetur adipiscing elit</li>
            <li>Sed do eiusmod tempor incididunt</li>
            <li>Ut labore et dolore magna aliqua</li>
            <li>Ut enim ad minim veniam</li>
          </ul>
          <ul>
            <li>Quis nostrud exercitation ullamco</li>
            <li>Laboris nisi ut aliquip ex ea commodo</li>
            <li>Duis aute irure dolor in reprehenderit</li>
            <li>Voluptate velit esse cillum dolore</li>
            <li>Excepteur sint occaecat cupidatat</li>
          </ul>
        </div>
        <p>
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
      </LandingPage>
      <script type="application/ld+json">
        {JSON.stringify(organization).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
