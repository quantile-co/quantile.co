import classes from "./HowItWorksSection.module.css";

const workflowSteps = [
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
  {
    title: "2-3 day turnaround",
    description:
      "AJ handles each issue directly. No junior handoffs, outsourcing or AI slop.",
  },
  {
    title: "Unlimited revisions",
    description:
      "Review and revise until the code meets your standards and the PR is approved, then begin the next prioritized issue.",
  },
  {
    title: "Concurrent PRs",
    description:
      "Additional subscriptions allow for concurrent PR development.",
  },
  {
    title: "Optional weekly call",
    description:
      "Async collaboration by default. Optional weekly call to use as you wish.",
  },
  {
    title: "Try it for a week",
    description:
      "Not loving it after a week? Get 75% back, no questions asked.",
  },
  {
    title: "Pause or cancel anytime",
    description:
      "Self-serve billing via Stripe. No long-term contracts, commitments, or fees.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section aria-label="How it works" className={classes.section}>
      <ol className={classes.steps}>
        {workflowSteps.map((step, index) => (
          <li className={classes.step} key={step.title}>
            <div className={classes.layout}>
              <div className={classes.content}>
                <h2
                  className={classes.title}
                  data-section-anchor={index === 0 ? true : undefined}
                  data-section-heading
                  id={index === 0 ? "how-it-works" : undefined}
                >
                  {step.title}
                </h2>
                <p className={classes.description}>{step.description}</p>
              </div>
              <div
                className={classes.placeholder}
                role="img"
                aria-label={`${step.title} animation placeholder`}
              >
                Animation coming soon
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
