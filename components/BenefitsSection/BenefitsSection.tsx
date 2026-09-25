import { Container, SimpleGrid, Stack, Text } from "@mantine/core";
import classes from "./BenefitsSection.module.css";

const benefits = [
  {
    title: "Senior expertise",
    description: "15+ years across Google, CompilerWorks, and Chartio.",
  },
  {
    title: "Direct accountability",
    description:
      "AJ handles each issue directly, from development through approval.",
  },
  {
    title: "Immediate onboarding",
    description: "No lengthy scoping, SOWs, kickoffs, audits, or assessments.",
  },
  {
    title: "Minimal overhead",
    description: "No recruiting or FTE costs. No agency bloat or bureaucracy.",
  },
  {
    title: "Flexible capacity",
    description:
      "Scale up by adding subscriptions. Scale down by pausing or canceling.",
  },
  {
    title: "Predictable spend",
    description:
      "One fixed monthly rate. No variable billing or change orders.",
  },
] as const;

export function BenefitsSection() {
  return (
    <section className={classes.section}>
      <Container className={classes.container} data-section-content size="lg">
        <Stack gap="xl">
          <Stack
            className={classes.heading}
            data-section-anchor
            gap="sm"
            id="benefits"
            py="md"
          >
            <Text className={classes.eyebrow}>Benefits</Text>
            <Text className={classes.title} component="h2" data-section-heading>
              <span className={classes.titleLine}>More capacity.</span>
              <span className={classes.titleLine}>Less overhead.</span>
            </Text>
            <Text className={classes.subtitle}>
              <span className={classes.subtitleLine}>
                Senior delivery without new headcount.
              </span>
              <span className={classes.subtitleLine}>
                Flexible capacity at one fixed rate.
              </span>
            </Text>
          </Stack>

          <SimpleGrid
            className={classes.featureGrid}
            cols={{ base: 1, sm: 2 }}
            component="ul"
            spacing={0}
            verticalSpacing={0}
          >
            {benefits.map(({ description, title }) => (
              <li className={classes.feature} key={title}>
                <Text className={classes.featureTitle}>{title}</Text>
                <Text className={classes.featureDescription}>
                  {description}
                </Text>
              </li>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </section>
  );
}
