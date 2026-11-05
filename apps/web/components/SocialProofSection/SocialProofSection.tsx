import { Container, Text } from "@mantine/core";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import classes from "./SocialProofSection.module.css";

const experience = [
  {
    company: "Google",
    byline: "Google Cloud · BigQuery",
    customers: [
      {
        name: "Palo Alto",
        logo: "/images/logos/palo-alto-networks.svg",
      },
      {
        name: "Verizon",
        logo: "/images/logos/verizon.svg",
      },
      {
        name: "Boeing",
        logo: "/images/logos/boeing.svg",
      },
    ],
  },
  {
    company: "CompilerWorks",
    byline: "Acquired by Google",
    customers: [
      {
        name: "PayPal",
        logo: "/images/logos/paypal.svg",
      },
      {
        name: "MLB",
        logo: "/images/logos/mlb.svg",
      },
      {
        name: "OfferUp",
        logo: "/images/logos/offerup.png",
      },
    ],
  },
  {
    company: "Chartio",
    byline: "YC S10 · Acquired by Atlassian",
    customers: [
      {
        name: "Reddit",
        logo: "/images/logos/reddit.svg",
      },
      {
        name: "Duolingo",
        logo: "/images/logos/duolingo.svg",
      },
      {
        name: "Lyft",
        logo: "/images/logos/lyft.svg",
      },
    ],
  },
] as const;

type ExperienceItem = (typeof experience)[number];

function CompanyMark({ company }: { company: ExperienceItem["company"] }) {
  if (company === "Google") {
    return (
      <IconBrandGoogleFilled
        aria-hidden="true"
        className={classes.googleMark}
        size={64}
      />
    );
  }

  const logo =
    company === "CompilerWorks"
      ? "/images/logos/compilerworks-mark.png"
      : "/images/logos/chartio-mark.png";

  return (
    <span
      aria-hidden="true"
      className={classes.companyMarkImage}
      style={{ "--logo-image": `url("${logo}")` } as CSSProperties}
    />
  );
}

function CompanyCard({ item }: { item: ExperienceItem }) {
  return (
    <article className={classes.proofCard} data-company={item.company}>
      <div className={classes.companyHeader}>
        <div className={classes.mediaSquare}>
          <CompanyMark company={item.company} />
        </div>
        <Text className={classes.proofTitle}>{item.company}</Text>
      </div>
      <div className={classes.customerLogos}>
        <div className={classes.experienceContext}>
          {item.byline} · <span>Clients:</span>
        </div>
        <div className={classes.customers}>
          {item.customers.map((customer) => (
            <div className={classes.customer} key={customer.name}>
              <span
                aria-hidden="true"
                className={classes.customerLogo}
                style={
                  { "--logo-image": `url("${customer.logo}")` } as CSSProperties
                }
              />
              <span className={classes.customerName}>{customer.name}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function SocialProofSection({
  ariaLabel = "Experience",
}: {
  ariaLabel?: string;
}) {
  return (
    <section aria-label={ariaLabel} className={classes.section}>
      <Container className={classes.wrapper} size="xl">
        <div className={classes.experienceGrid}>
          {experience.map((item) => (
            <CompanyCard item={item} key={item.company} />
          ))}
        </div>
      </Container>
    </section>
  );
}
