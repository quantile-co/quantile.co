import { Container, type ContainerProps, VisuallyHidden } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./LandingPage.module.css";

export function LandingPage({
  className,
  containerProps,
  headline,
  heading,
  showVideo = true,
  introduction,
  proof,
  action,
  newsletterForm,
  newsletterFooter,
  postscript = "P.S. Subscribe to the AI newsletter for data leaders below.",
  children,
}: {
  className?: string;
  containerProps?: Pick<ContainerProps, "size" | "px">;
  headline?: string;
  heading?: ReactNode;
  showVideo?: boolean;
  introduction: ReactNode;
  proof: ReactNode;
  action: ReactNode;
  newsletterForm?: ReactNode;
  newsletterFooter?: ReactNode;
  postscript?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${classes.page} ${className ?? ""}`} id="top">
      <Container
        component="main"
        size="xl"
        px={0}
        {...containerProps}
        className={classes.main}
        id="main-content"
        tabIndex={-1}
      >
        <div className={classes.content}>
          <div className={classes.intro}>
            {heading ??
              (headline ? (
                <h1 className={classes.title} id="founder-letter-title">
                  {headline}
                </h1>
              ) : (
                <VisuallyHidden component="h1" id="founder-letter-title">
                  Consulting
                </VisuallyHidden>
              ))}
            {showVideo && (
              <section
                aria-label="Video introduction"
                className={classes.videoPlaceholder}
                data-with-title={headline || heading ? true : undefined}
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
            {newsletterFooter ?? (
              <div className={classes.postscript}>
                <p>{postscript}</p>
                {newsletterForm}
              </div>
            )}
          </article>
        </div>
      </Container>
    </div>
  );
}
