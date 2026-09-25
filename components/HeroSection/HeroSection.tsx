import { Button, Container, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./HeroSection.module.css";

type HeroSectionProps = {
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  id?: string;
  compactDescription?: string;
  order?: 1 | 2;
  signUpHref: string;
  title: string;
  titleSize?: "hero" | "section";
  visual?: ReactNode;
};

export function HeroSection({
  children,
  compactDescription,
  description,
  eyebrow,
  id,
  order = 1,
  signUpHref,
  title,
  titleSize = "hero",
  visual,
}: HeroSectionProps) {
  const sectionScale = titleSize === "section";
  const titleSizeClass = sectionScale
    ? classes.sectionTitle
    : classes.heroTitle;
  const descriptionSizeClass = sectionScale
    ? classes.sectionDescription
    : classes.heroDescription;
  const ctaScale = sectionScale ? "section" : "hero";
  const ctaSize = sectionScale ? "lg" : "xl";

  return (
    <section
      className={classes.section}
      data-has-visual={visual ? true : undefined}
      id={sectionScale ? undefined : id}
    >
      <Container className={classes.wrapper} size="xl">
        <div className={classes.layout}>
          <div
            className={classes.content}
            data-section-anchor={sectionScale && id ? true : undefined}
            data-section-scale={sectionScale || undefined}
            id={sectionScale ? id : undefined}
          >
            {eyebrow ? (
              <Text className={classes.eyebrow}>{eyebrow}</Text>
            ) : null}
            <Title
              className={`${classes.title} ${titleSizeClass}`}
              data-section-heading
              order={order}
            >
              {title}
            </Title>

            {description ? (
              <>
                <Text
                  c="dimmed"
                  className={`${classes.description} ${descriptionSizeClass} ${compactDescription ? classes.defaultDescription : ""}`}
                >
                  {description}
                </Text>
                {compactDescription ? (
                  <Text
                    c="dimmed"
                    className={`${classes.description} ${classes.heroDescription} ${classes.compactDescription}`}
                  >
                    {compactDescription}
                  </Text>
                ) : null}
              </>
            ) : null}

            {children}

            <div className={classes.controls}>
              <Button
                component="a"
                data-site-cta={ctaScale}
                href="#book-a-call"
                size={ctaSize}
                variant="outline"
              >
                Book a call
              </Button>
              <Button
                autoContrast
                component="a"
                data-site-cta={ctaScale}
                href={signUpHref}
                size={ctaSize}
                variant="filled"
              >
                Start building
              </Button>
            </div>
          </div>
          {visual ? <div className={classes.visual}>{visual}</div> : null}
        </div>
      </Container>
    </section>
  );
}
