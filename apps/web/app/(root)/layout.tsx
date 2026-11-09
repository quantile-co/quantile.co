import { Container } from "@mantine/core";
import type { ReactNode } from "react";
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { Header } from "@/components/Header/Header";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import classes from "../layout.module.css";

function HomeLink() {
  return (
    <a aria-label="Quantile home" className={classes.homeLink} href="/">
      <span aria-label="Quantile" className={classes.wordmark} role="img" />
    </a>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header action={<CTAButton />} />
      <div className={classes.content}>{children}</div>
      <Container component="footer" fluid px={0} className={classes.footer}>
        <div aria-hidden="true" className={classes.divider}>
          <span className={classes.outerLeft} />
          <span className={classes.slopeLeft} />
          <span className={classes.innerLine} />
          <span className={classes.slopeRight} />
          <span className={classes.outerRight} />
        </div>
        <Container
          size="xl"
          px="var(--site-page-padding)"
          className={classes.footerInner}
        >
          <HomeLink />
          <p className={classes.copyright}>
            © {new Date().getFullYear()} Quantile LLC
          </p>
          <div className={classes.theme}>
            <ThemeSwitcher />
          </div>
        </Container>
      </Container>
    </>
  );
}
