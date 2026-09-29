import classes from "./BenefitsSection.module.css";

const categories = [
  {
    id: "benefits",
    title: "Rapid onboarding.\nMinimal overhead.",
    subtitle:
      "Staff up quickly without lengthy hiring cycles, recruiter fees, or FTE overhead. No agency red tape, endless discovery calls or protracted SOW and contract negotiations.",
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
          "Assign and prioritize issues from your backlog, with the freedom to adjust as priorities shift.",
      },
    ],
  },
  {
    id: "benefits-expertise",
    title: "Senior engineering.\nAccelerated with AI.",
    subtitle:
      "AJ works directly with your team using your preferred AI tools and workflows, bringing 15+ years of data engineering judgment to every issue. No agency PMs, junior handoffs, or offshore teams.",
    steps: [
      {
        title: "Daily updates",
        description:
          "Issues and PRs are updated daily with progress, next steps, and any blockers.",
      },
      {
        title: "Unlimited revisions",
        description:
          "PRs are revised until they meet your team's standards and are approved and merged.",
      },
      {
        title: "Optional weekly call",
        description:
          "Collaboration is async, with a weekly 30-minute call available for deeper technical discussions.",
      },
    ],
  },
  {
    id: "benefits-capacity",
    title: "Predictable spend.\nFlexible capacity.",
    subtitle:
      "Know your monthly cost upfront. Choose how many concurrent in-progress issues you need, then adjust as your backlog changes. No long-term contracts, hourly billing surprises, or agency change orders.",
    steps: [
      {
        title: "One monthly rate",
        description:
          "Pay a fixed monthly rate based on how many concurrent in-progress issues you need.",
      },
      {
        title: "Scale up or down",
        description:
          "Adjust the number of concurrent in-progress issues as your backlog changes.",
      },
      {
        title: "Pause or cancel anytime",
        description:
          "Pause your subscription via Stripe and bank the remainder. Cancel when no longer needed.",
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
