import classes from "./BenefitsSection.module.css";

const categories = [
  {
    id: "benefits",
    title: "Fast onboarding.\nMinimal overhead.",
    subtitle:
      "Staff up quickly without costly hiring cycles, recruiter fees, or FTE overhead. No agency red tape, endless discovery calls or protracted SOW/contract negotiations.",
    steps: [
      {
        title: "Subscribe",
        description:
          "Subscribe today via Stripe and you'll be sent a welcome email with next steps.",
      },
      {
        title: "Share access",
        description:
          "Grant access to your existing systems: GitHub, Linear, Slack, AWS, GCP, etc.",
      },
      {
        title: "Assign issues",
        description:
          "Assign a backlog of issues. Prioritize which issues are worked on next.",
      },
    ],
  },
  {
    id: "benefits-expertise",
    title: "Senior engineering.\nAccelerated with AI.",
    subtitle:
      "AJ works directly with your team and within your AI tooling and workflows, bringing 15+ years of data engineering judgment to every issue. No agency PMs, junior handoffs, or offshore teams.",
    steps: [
      {
        title: "Daily updates",
        description:
          "AJ keeps your team in the loop through daily updates to issues and PRs in your existing tools.",
      },
      {
        title: "Unlimited revisions",
        description:
          "AJ revises each PR until it meets your team's standards and has been approved and merged.",
      },
      {
        title: "Optional weekly call",
        description:
          "AJ collaborates with your team async, with a weekly 30-minute call available as needed.",
      },
    ],
  },
  {
    id: "benefits-capacity",
    title: "Predictable spend.\nFlexible capacity.",
    subtitle:
      "Know your monthly cost upfront. Choose the number of in-progress issues that fits your backlog, then scale as needs change. No surprise hourly bills, agency change orders, or long-term contracts.",
    steps: [
      {
        title: "One subscription",
        description:
          "One subscription, billed at a fixed monthly rate per in-progress issue. No usage-based fees or change orders.",
      },
      {
        title: "Scale up or down",
        description:
          "Adjust the number of in-progress issues on your subscription as your needs change.",
      },
      {
        title: "Pause or cancel anytime",
        description:
          "Pause your subscription via Stripe to bank remaining time. Cancel when no longer needed.",
      },
    ],
  },
] as const;

type BenefitsSectionProps = {
  signUpHref: string;
};

export function BenefitsSection({ signUpHref }: BenefitsSectionProps) {
  return (
    <div className={classes.group}>
      {categories.map((category) => (
        <section
          aria-labelledby={category.id}
          className={classes.category}
          key={category.id}
        >
          <h2
            className={classes.categoryTitle}
            data-section-anchor={category.id === "benefits" || undefined}
            data-section-heading
            id={category.id}
          >
            {category.title}
          </h2>
          <p className={classes.categorySubtitle}>{category.subtitle}</p>
          <ol className={classes.steps}>
            {category.steps.map((step) => (
              <li className={classes.step} key={step.title}>
                <h3 className={classes.title} data-section-heading>
                  {step.title}
                </h3>
                <p className={classes.description}>
                  {step.title === "Subscribe" ? (
                    <>
                      <a className={classes.stepLink} href={signUpHref}>
                        Subscribe
                      </a>
                      {step.description.slice(step.title.length)}
                    </>
                  ) : (
                    step.description
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
