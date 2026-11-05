import { VisuallyHidden } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./LandingPage.module.css";

export function LandingPage({
  className,
  headline,
  introduction,
  proof,
  action,
  newsletterForm,
  children,
}: {
  className?: string;
  headline?: string;
  introduction: ReactNode;
  proof: ReactNode;
  action: ReactNode;
  newsletterForm: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${classes.page} ${className ?? ""}`} id="top">
      <main className={classes.main} id="main-content" tabIndex={-1}>
        <div className={classes.intro}>
          {headline ? (
            <h1 className={classes.title} id="founder-letter-title">
              {headline}
            </h1>
          ) : (
            <VisuallyHidden component="h1" id="founder-letter-title">
              Consulting
            </VisuallyHidden>
          )}
          <section
            aria-label="Video introduction"
            className={classes.videoPlaceholder}
            data-with-title={headline ? true : undefined}
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
          <p>{introduction}</p>
          <div className={classes.proof}>{proof}</div>
          {children}
          <div className={classes.letterClosing}>
            <p className={classes.signature}>
              <span>AJ Welch</span>
              <a href="mailto:aj@quantile.co">aj@quantile.co</a>
            </p>
            <div className={classes.letterAction}>{action}</div>
          </div>
          <div className={classes.postscript}>
            <p>
              P.S. For more on AI and data, you can subscribe to my newsletter
              below.
            </p>
            {newsletterForm}
          </div>
        </article>
      </main>
    </div>
  );
}
