import { Container, VisuallyHidden } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./LandingPage.module.css";

export function LandingPage({
  className,
  headline,
  sidebar,
  showVideo = true,
  introduction,
  proof,
  action,
  newsletterForm,
  postscript = "P.S. Subscribe to the AI newsletter for data leaders below.",
  children,
}: {
  className?: string;
  headline?: string;
  sidebar?: ReactNode;
  showVideo?: boolean;
  introduction: ReactNode;
  proof: ReactNode;
  action: ReactNode;
  newsletterForm: ReactNode;
  postscript?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${classes.page} ${className ?? ""}`} id="top">
      <Container
        component="main"
        size="xl"
        px={sidebar ? "var(--site-page-padding)" : 0}
        className={classes.main}
        data-with-sidebar={sidebar ? true : undefined}
        id="main-content"
        tabIndex={-1}
      >
        {sidebar && <div className={classes.sidebar}>{sidebar}</div>}
        <div className={classes.content}>
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
            {showVideo && (
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
            )}
          </div>
          <article
            aria-labelledby="founder-letter-title"
            className={classes.letter}
            data-with-video={showVideo ? true : undefined}
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
              <p>{postscript}</p>
              {newsletterForm}
            </div>
          </article>
        </div>
      </Container>
    </div>
  );
}
