import { Button, Container, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./PricingSection.module.css";

type PricingSectionProps = {
  mobileProof?: ReactNode;
  signUpFormId: string;
};

export function PricingSection({
  mobileProof,
  signUpFormId,
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
        <Text className={classes.offer}>Limited-Time Offer, Starting At</Text>
        <div className={classes.priceRow}>
          <div className={classes.currentPrice}>
            <Text className={classes.price}>$4,995</Text>
            <Text className={classes.perMonth}>/month</Text>
          </div>
          <Text className={classes.originalPrice} component="del">
            $5,995
          </Text>
        </div>
        <ul className={classes.highlights}>
          <li className={classes.highlight}>
            <h3 className={classes.highlightTitle} data-section-heading>
              Try it for a week
            </h3>
            <p className={classes.highlightDescription}>
              Not loving it? Cancel within the first week and get 75% back, no
              questions asked.
            </p>
          </li>
          <li className={classes.highlight}>
            <h3 className={classes.highlightTitle} data-section-heading>
              Scale up or down
            </h3>
            <p className={classes.highlightDescription}>
              Pricing scales with how many concurrent in-progress issues you
              need. Adjust as needed.
            </p>
          </li>
          <li className={classes.highlight}>
            <h3 className={classes.highlightTitle} data-section-heading>
              Pause or cancel anytime
            </h3>
            <p className={classes.highlightDescription}>
              Self-serve billing via Stripe. No long-term contracts,
              commitments, or fees.
            </p>
          </li>
        </ul>
        <div className={classes.pricingGrid}>
          <div className={classes.actions}>
            <Button
              autoContrast
              className={classes.action}
              data-site-cta="hero"
              form={signUpFormId}
              size="xl"
              type="submit"
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
