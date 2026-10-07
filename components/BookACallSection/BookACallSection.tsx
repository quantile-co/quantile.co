import { Container } from "@mantine/core";
import { IconArrowRight, IconMail } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./BookACallSection.module.css";

type BookACallSectionProps = {
  calendar: ReactNode;
  description?: ReactNode;
  headingLevel?: 1 | 2;
  title?: ReactNode;
};

export function BookACallSection({
  calendar,
  description,
  headingLevel = 2,
  title,
}: BookACallSectionProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section>
      <Container className={classes.wrapper} data-section-content size="lg">
        <Heading className={classes.title} data-section-anchor id="book-a-call">
          {title ?? (
            <>
              Ready to build
              <br />
              something great
              <br />
              together?
            </>
          )}
        </Heading>
        {description && <p className={classes.description}>{description}</p>}
        {description ? (
          <div className={classes.calendarAfterDescription}>{calendar}</div>
        ) : (
          calendar
        )}
        <a className={classes.emailCard} href="mailto:aj@quantile.co">
          <IconMail
            aria-hidden="true"
            className={classes.emailIcon}
            size={20}
            stroke={1.5}
          />
          <span className={classes.emailCopy}>
            <span className={classes.emailLabel}>Prefer email?</span>
            <span className={classes.emailAddress}>aj@quantile.co</span>
          </span>
          <IconArrowRight
            aria-hidden="true"
            className={classes.emailArrow}
            size={20}
            stroke={1.5}
          />
        </a>
      </Container>
    </section>
  );
}
