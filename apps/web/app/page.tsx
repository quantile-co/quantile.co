import { Title } from "@mantine/core";
import Image from "next/image";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { LandingPage } from "@/components/LandingPage/LandingPage";
import { SocialProofSection } from "@/components/SocialProofSection/SocialProofSection";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { createPageMetadata, organization, website } from "@/lib/metadata";
import classes from "./page.module.css";

const pageTitle = "Data & AI Engineering Consulting";
const heroDescription =
  "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.";

export const metadata = createPageMetadata({
  title: pageTitle,
  description: heroDescription,
  pathname: "/",
});

export default function Home() {
  return (
    <>
      <LandingPage
        className={classes.page}
        containerProps={{ size: 800, px: "var(--site-page-padding)" }}
        heading={
          <div className={classes.heading}>
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
              Hi, I’m AJ.
            </Title>
          </div>
        }
        introduction="I’ve been a software engineer for over 15 years at:"
        proof={
          <SocialProofSection ariaLabel="Company experience and client work" />
        }
        action={<CTAButton />}
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
      <footer className={classes.footer}>
        <p>© {new Date().getFullYear()} Quantile LLC</p>
        <ThemeSwitcher />
      </footer>
      <script type="application/ld+json">
        {JSON.stringify([organization, website]).replace(/</g, "\\u003c")}
      </script>
    </>
  );
}
