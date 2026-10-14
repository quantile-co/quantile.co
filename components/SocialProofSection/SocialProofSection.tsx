"use client";

import { Container, Text } from "@mantine/core";
import { useMediaQuery, useReducedMotion } from "@mantine/hooks";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { type CSSProperties, useEffect, useState } from "react";
import { ProfileCard } from "./ProfileCard";
import classes from "./SocialProofSection.module.css";

const experience = [
  {
    company: "Google",
    context: ["GCP", "BigQuery"],
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
    context: ["Acquired by Google"],
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
    context: ["YC S10", "Acquired by Atlassian"],
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

const proofCardCount = experience.length + 1;

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

function CompanyCard({
  compact = false,
  inactive = false,
  item,
}: {
  compact?: boolean;
  inactive?: boolean;
  item: ExperienceItem;
}) {
  return (
    <article
      aria-hidden={inactive || undefined}
      aria-label={compact ? item.company : undefined}
      className={`${classes.proofCard}${inactive ? ` ${classes.inactiveCard}` : ""}`}
      data-compact={compact || undefined}
      data-company={item.company}
    >
      <div className={classes.mediaSquare} data-company={item.company}>
        <CompanyMark company={item.company} />
        {compact && (
          <span className={classes.compactCompanyName}>{item.company}</span>
        )}
      </div>

      {!compact && (
        <div className={classes.proofContent}>
          <Text className={classes.proofTitle}>{item.company}</Text>
          <div className={classes.experienceContext}>
            {[...item.context, "Clients:"].map((context) => (
              <span key={context}>{context}</span>
            ))}
          </div>
          <div className={classes.customerLogos}>
            {item.customers.map((customer) => (
              <div className={classes.customer} key={customer.name}>
                <span
                  aria-hidden="true"
                  className={classes.customerLogo}
                  style={
                    {
                      "--logo-image": `url("${customer.logo}")`,
                    } as CSSProperties
                  }
                />
                <span className={classes.customerName}>{customer.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function CompactSocialProof() {
  return (
    <section
      aria-label="AJ Welch's experience and client work"
      className={`${classes.section} ${classes.compactSection}`}
    >
      <div className={classes.compactGrid}>
        <ProfileCard compact />
        <div className={classes.compactTenure}>
          <strong>15+</strong>
          <span>
            years of
            <br />
            experience
          </span>
        </div>
        {experience.map((item) => (
          <CompanyCard compact item={item} key={item.company} />
        ))}
      </div>
    </section>
  );
}

export function SocialProofSection({
  ariaLabel,
  embedded = false,
  hideOnMobile = false,
}: {
  ariaLabel?: string;
  embedded?: boolean;
  hideOnMobile?: boolean;
}) {
  const Root = ariaLabel ? "section" : "div";
  const isCarousel = useMediaQuery("(max-width: 47.9375em)");
  const isSingleCard = useMediaQuery("(max-width: 36em)");
  const canHover = useMediaQuery("(hover: hover)");
  const reducedMotion = useReducedMotion();
  const cardsPerPage = isCarousel ? (isSingleCard ? 1 : 2) : proofCardCount;
  const [page, setPage] = useState(0);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimationsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isCarousel || hovered || focusWithin || userPaused || reducedMotion) {
      return;
    }

    let timeout: number;
    const advance = () => {
      setPage((current) => {
        const pageStart = current - (current % cardsPerPage);
        return (pageStart + cardsPerPage) % proofCardCount;
      });
    };
    const schedule = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        advance();
        schedule();
      }, 3200);
    };
    const resume = () => {
      if (!document.hidden) {
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [
    cardsPerPage,
    focusWithin,
    hovered,
    isCarousel,
    reducedMotion,
    userPaused,
  ]);

  const pageStart = isCarousel ? page - (page % cardsPerPage) : 0;
  const cardIndexes = Array.from(
    { length: proofCardCount },
    (_, offset) => (pageStart + offset) % proofCardCount,
  );
  const pageCards = cardIndexes.map((cardIndex, offset) => {
    const inactive = isCarousel && offset >= cardsPerPage;

    return cardIndex === 0 ? (
      <ProfileCard inactive={inactive} key="profile" />
    ) : (
      <CompanyCard
        inactive={inactive}
        item={experience[cardIndex - 1]}
        key={experience[cardIndex - 1].company}
      />
    );
  });
  const carouselName = embedded
    ? "Pricing experience"
    : hideOnMobile
      ? "Additional experience"
      : "Experience";
  const carouselInstruction = reducedMotion
    ? "Automatic card changes are disabled by your motion preference."
    : userPaused
      ? "Automatic card changes are paused. Click, tap, or press Enter or Space to resume."
      : "Automatic card changes are playing. Click, tap, or press Enter or Space to pause.";

  return (
    <Root
      aria-label={ariaLabel}
      className={classes.section}
      data-embedded={embedded || undefined}
      data-hide-mobile={hideOnMobile || undefined}
    >
      <Container className={classes.wrapper} size="xl">
        <section
          aria-label={
            isCarousel
              ? `${carouselName} carousel. ${carouselInstruction}`
              : undefined
          }
          aria-roledescription={isCarousel ? "carousel" : undefined}
          className={classes.experienceGrid}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setFocusWithin(false);
            }
          }}
          onClick={(event) => {
            if (
              !isCarousel ||
              reducedMotion ||
              (event.target as HTMLElement).closest("a")
            ) {
              return;
            }

            setUserPaused((value) => !value);
          }}
          onFocus={() => setFocusWithin(true)}
          onKeyDown={(event) => {
            if (
              !isCarousel ||
              reducedMotion ||
              (event.target as HTMLElement).closest("a") ||
              (event.key !== "Enter" && event.key !== " ")
            ) {
              return;
            }

            event.preventDefault();
            setUserPaused((value) => !value);
          }}
          onPointerEnter={() => canHover && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          tabIndex={isCarousel && !reducedMotion ? 0 : undefined}
        >
          {animationsReady ? (
            <LazyMotion features={domAnimation}>
              <AnimatePresence initial={false} mode="wait">
                <m.div
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  className={classes.experiencePage}
                  exit={{
                    filter: "blur(2px)",
                    opacity: 0.08,
                    transition: { duration: 0.16, ease: "easeIn" },
                  }}
                  initial={{ filter: "blur(2px)", opacity: 0.08 }}
                  key={`${cardsPerPage}-${pageStart}`}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                >
                  {pageCards}
                </m.div>
              </AnimatePresence>
            </LazyMotion>
          ) : (
            <div className={classes.experiencePage}>{pageCards}</div>
          )}
        </section>
      </Container>
    </Root>
  );
}
