import { Button, Container, Text, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./PricingSection.module.css";

const features = [
  "Senior data engineer",
  "Direct accountability",
  "Immediate onboarding",
  "Your existing tools and systems",
  "Unlimited issue backlog",
  "Async collaboration by default",
  "Guaranteed code quality",
  "Try it for a week",
  "Pause or cancel anytime",
] as const;

type PricingSectionProps = {
  mobileProof?: ReactNode;
  signUpHref: string;
};

export function PricingSection({
  mobileProof,
  signUpHref,
}: PricingSectionProps) {
  return (
    <section className={classes.section}>
      <Container className={classes.wrapper} data-section-content size="lg">
        <Title
          className={classes.title}
          data-section-anchor
          data-section-heading
          id="pricing"
          order={2}
        >
          Pricing
        </Title>
        <Text className={classes.subtitle}>Limited-Time Offer</Text>
        <div className={classes.pricingGrid}>
          <article className={classes.plan}>
            <div className={classes.priceRow}>
              <div className={classes.currentPrice}>
                <Text className={classes.price}>$4,995</Text>
                <Text className={classes.perMonth}>/month</Text>
              </div>
              <Text className={classes.originalPrice} component="del">
                $5,995
              </Text>
            </div>

            <Text className={classes.planSummary}>
              <span>
                One active PR per subscription. Most ready in 2-3 days.
              </span>
              <span>Add subscriptions for concurrent PRs.</span>
            </Text>

            <div className={classes.detailsGrid}>
              <ul className={classes.features}>
                {features.map((feature) => (
                  <li key={feature}>
                    <IconCheck aria-hidden="true" size={18} stroke={2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <div className={classes.actions}>
            <Button
              autoContrast
              className={classes.action}
              component="a"
              data-site-cta="hero"
              href={signUpHref}
              size="xl"
              variant="filled"
            >
              Start building
            </Button>
          </div>

          {mobileProof ? (
            <div className={classes.mobileProof}>{mobileProof}</div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
