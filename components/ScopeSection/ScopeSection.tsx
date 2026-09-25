import { Container, SimpleGrid, Stack, Text } from "@mantine/core";
import classes from "./ScopeSection.module.css";

const scopeAreas = [
  {
    title: "AI agents, RAG & analytics",
    description: "LangChain, Pydantic AI, pandas, Jupyter and more...",
  },
  {
    title: "Orchestration & transformation",
    description: "Airflow, Prefect, Dagster, dbt, SQLMesh and more...",
  },
  {
    title: "Storage & processing",
    description: "BigQuery, Snowflake, Databricks and more...",
  },
  {
    title: "Integration & streaming",
    description: "Airbyte, dlt, Debezium, Kafka, Flink and more...",
  },
  {
    title: "Observability & governance",
    description: "Langfuse, OpenMetadata, DataHub, GX and more...",
  },
  {
    title: "Infrastructure & automation",
    description: "Terraform, OpenTofu, Docker, Kubernetes and more...",
  },
] as const;

export function ScopeSection() {
  return (
    <section className={classes.section}>
      <Container className={classes.container} data-section-content size="lg">
        <Stack gap="xl">
          <Stack
            className={classes.heading}
            data-section-anchor
            gap="sm"
            id="scope"
            py="md"
          >
            <Text className={classes.eyebrow}>Scope</Text>
            <Text className={classes.title} component="h2" data-section-heading>
              <span className={classes.titleLine}>Data engineering,</span>
              <span className={classes.titleLine}>end to end.</span>
            </Text>
            <Text className={classes.subtitle}>
              <span className={classes.subtitleLine}>
                From AI systems to infrastructure.
              </span>
              <span className={classes.subtitleLine}>
                Across the complete data stack.
              </span>
            </Text>
          </Stack>

          <SimpleGrid
            className={classes.scopeGrid}
            cols={{ base: 1, sm: 2 }}
            component="ul"
            spacing={0}
            verticalSpacing={0}
          >
            {scopeAreas.map((area) => (
              <li className={classes.scopeItem} key={area.title}>
                <Text className={classes.itemTitle}>{area.title}</Text>
                <Text className={classes.itemDescription}>
                  {area.description}
                </Text>
              </li>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </section>
  );
}
