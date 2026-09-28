import classes from "./BenefitsSection.module.css";

const categories = [
  {
    id: "benefits",
    title: "Immediate onboarding.\nMinimal overhead.",
    subtitle:
      "Subscribe without recruiting or lengthy scoping. Connect your tools and prioritize the first issue.",
    steps: [
      {
        title: "Subscribe",
        description:
          "Subscribe and get started today. No lengthy calls, SOWs, or red tape.",
      },
      {
        title: "Share access",
        description:
          "Grant access to your existing systems: GitHub, Linear, Slack, AWS, GCP, etc.",
      },
      {
        title: "Assign issues",
        description:
          "Assign a backlog of issues. Prioritize one issue for active development.",
      },
    ],
  },
  {
    id: "benefits-expertise",
    title: "Intelligent implementation.\nGuaranteed code quality.",
    subtitle:
      "Work directly with AJ, bringing 15+ years of experience to each issue from development through PR approval.",
    steps: [
      {
        title: "Senior engineering + AI",
        description:
          "AJ handles each issue directly, with AI tools under human review. Most PRs are ready in 2-3 business days. No junior handoffs or outsourcing.",
      },
      {
        title: "Unlimited revisions",
        description:
          "Review and revise until the code meets your standards and the PR is approved, then begin the next prioritized issue.",
      },
      {
        title: "Optional weekly call",
        description:
          "Async collaboration by default. Optional weekly call to use as you wish.",
      },
    ],
  },
  {
    id: "benefits-capacity",
    title: "Fixed spend.\nFlexible capacity.",
    subtitle:
      "Scale capacity up or down without hiring, variable billing, or long-term commitments.",
    steps: [
      {
        title: "One subscription",
        description:
          "One active PR at a fixed monthly rate. No variable billing or change orders.",
      },
      {
        title: "Concurrent PRs",
        description:
          "Additional subscriptions allow for concurrent PR development.",
      },
      {
        title: "Pause or cancel anytime",
        description:
          "Self-serve billing via Stripe. No long-term contracts, commitments, or fees.",
      },
    ],
  },
] as const;

export function BenefitsSection() {
  return (
    <div className={classes.group}>
      {categories.map((category) => (
        <section
          aria-labelledby={category.id}
          className={classes.category}
          key={category.id}
        >
          <div className={classes.categoryHeader}>
            <div className={classes.categoryText}>
              <h2
                className={classes.categoryTitle}
                data-section-anchor={category.id === "benefits" || undefined}
                data-section-heading
                id={category.id}
              >
                {category.title}
              </h2>
              <p className={classes.categorySubtitle}>{category.subtitle}</p>
            </div>
            <div
              aria-label={`${category.title.replace("\n", " ")} animation placeholder`}
              className={classes.placeholder}
              role="img"
            >
              Animation coming soon
            </div>
          </div>
          <ol className={classes.steps}>
            {category.steps.map((step) => (
              <li className={classes.step} key={step.title}>
                <h3 className={classes.title} data-section-heading>
                  {step.title}
                </h3>
                <p className={classes.description}>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
