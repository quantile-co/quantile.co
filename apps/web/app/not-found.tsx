import { SkipLink } from "@/components/SkipLink/SkipLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import classes from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={classes.page}>
      <SkipLink href="#main-content">Skip to content</SkipLink>
      <main className={classes.main} id="main-content" tabIndex={-1}>
        <div className={classes.content}>
          <p className={classes.code}>404</p>
          <h1 className={classes.title}>Page not found.</h1>
          <p className={classes.description}>We couldn’t find that page.</p>
          <a className={classes.homeLink} href="/">
            Back to home
          </a>
        </div>
      </main>
      <ThemeSwitcher />
    </div>
  );
}
