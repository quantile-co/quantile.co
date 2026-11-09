import { Container, type ContainerProps } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./LandingPage.module.css";

export function LandingPage({
  className,
  containerProps,
  heading,
  introduction,
  proof,
  action,
  children,
  footer,
}: {
  className?: string;
  containerProps?: Pick<ContainerProps, "size" | "px">;
  heading: ReactNode;
  introduction: ReactNode;
  proof: ReactNode;
  action: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
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
        {heading}
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
        </article>
        {footer}
      </Container>
    </div>
  );
}
