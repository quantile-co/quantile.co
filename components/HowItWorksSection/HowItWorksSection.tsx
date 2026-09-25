import { Container, SimpleGrid, Stack, Text } from "@mantine/core";
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
      "Review and revise until PR approval, then begin the next prioritized issue.",
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
    title: "Pause or cancel anytime",
    description:
      "Self-serve billing via Stripe. No long-term contracts, commitments, or fees.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className={classes.section}>
      <Container className={classes.container} data-section-content size="lg">
        <Stack gap="xl">
          <Stack
            className={classes.heading}
            data-section-anchor
            gap="sm"
            id="how-it-works"
            py="md"
          >
            <Text className={classes.eyebrow}>How it works</Text>
            <Text className={classes.title} component="h2" data-section-heading>
              <span className={classes.titleLine}>Subscribe. Assign.</span>
              <span className={classes.titleLine}>Review. Repeat.</span>
            </Text>
            <Text className={classes.subtitle}>
              <span className={classes.subtitleLine}>
                From backlog issue to reviewed PR.
              </span>
              <span className={classes.subtitleLine}>
                One focused cycle at a time.
              </span>
            </Text>
          </Stack>

          <SimpleGrid
            className={classes.workflow}
            cols={{ base: 1, sm: 2 }}
            component="ol"
            spacing={0}
            verticalSpacing={0}
          >
            {workflowSteps.map((step) => (
              <li key={step.title}>
                <Text className={classes.stepTitle}>{step.title}</Text>
                <Text className={classes.stepDescription}>
                  {step.description}
                </Text>
              </li>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </section>
  );
}
