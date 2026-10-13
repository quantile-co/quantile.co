import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FaqSection } from "./FaqSection";

const liveLoginUrl =
  "https://billing.stripe.com/p/login/bJeeVe3TIaVO9ODfkn6AM00";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return (
    <form action="/checkout-preview" method="post">
      {children}
    </form>
  );
}

describe("FAQ billing portal links", () => {
  it("links capacity and cancellation answers to the shareable live portal login", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <FaqSection
          billingPortalLoginUrl={liveLoginUrl}
          CheckoutForm={PreviewCheckoutForm}
        />
      </MantineProvider>,
    );

    expect(html.match(new RegExp(`href="${liveLoginUrl}"`, "g"))).toHaveLength(
      2,
    );
    expect(html).not.toMatch(/<section class="[^"]*welcome[^"]*"/);
    expect(html).toContain("How do I scale up or down?");
    expect(html).toContain("How do I pause or cancel?");
    expect(html).toContain("You can assign data and AI engineering issues");
    expect(html).toContain(
      "<p>Primary languages: Python and Java.</p><p>Secondary languages are Go, TypeScript, and C.</p>",
    );
    expect(html).toContain(
      "Dagster, Temporal, Conductor, DBOS, dbt, SQLMesh, Spring Batch, AWS Glue, AWS Step Functions, GCP Composer, GCP Dataform, Snowflake Tasks, Databricks Lakeflow Jobs",
    );
    expect(html).toContain(
      "Databricks, Spark, ClickHouse, Redshift, Athena, DuckDB, MotherDuck, Trino, Pinot, Parquet, Iceberg, Delta Lake",
    );
    expect(html).toContain(
      "Debezium, Flink, Beam, Kafka, Redpanda, Camel, Spring Integration",
    );
    expect(html).toContain(
      "Spring Integration, AWS Kinesis, GCP Pub/Sub, GCP Dataflow, GCP Datastream, Snowflake Snowpipe Streaming, Databricks Auto Loader",
    );
    expect(html).toContain("GCP Dataplex, AWS Glue Data Catalog, DataHub");
    expect(html).toContain("Langfuse, Grafana");
    expect(html).toContain("mechanical coding");
    expect(html).not.toContain("repetitive coding");
    expect(html).toContain("Docker, Kubernetes, Jenkins, Gradle, Dagger");
    expect(html).toContain(
      "Data platform, query, pipeline, agent, and application performance tuning.",
    );
    expect(html).toContain(
      "LangChain, LangGraph, LlamaIndex, Haystack, LangChain4j, Pydantic AI, Spring AI, Anthropic, OpenAI, Gemini, ADK, Cortex, Agent Bricks, Bedrock",
    );
    expect(html).toContain(
      "SQL, dbt, pandas, Polars, Jupyter, marimo, Ibis, SQLGlot, jOOQ, Tablesaw, Calcite, Spring Data, Snowpark, BigQuery DataFrames, Spark DataFrames",
    );
    expect(html.indexOf("AI agents and workflows:")).toBeLessThan(
      html.indexOf("Analytics and modeling:"),
    );
    expect(html).toContain('<form action="/checkout-preview" method="post">');
    expect(html).toMatch(/<form[^>]*><p><button[^>]*type="submit"/);
    expect(html).toContain("book a free intro call below");
    expect(html).not.toContain("Check your welcome email for next steps");
    expect(html).not.toContain("through Stripe");
    expect(html).not.toContain("/p/session/");
  });
});
