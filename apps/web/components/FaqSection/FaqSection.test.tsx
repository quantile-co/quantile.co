import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FaqSection } from "./FaqSection";

const productionLoginUrl =
  "https://billing.quantile.co/p/login/bJeeVe3TIaVO9ODfkn6AM00";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return (
    <form action="/checkout-preview" method="post">
      {children}
    </form>
  );
}

describe("FAQ rendering", () => {
  it("links capacity and cancellation answers to the shareable production portal login", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <FaqSection
          billingPortalLoginUrl={productionLoginUrl}
          compactProof={<div>Preview experience</div>}
          CheckoutForm={PreviewCheckoutForm}
        />
      </MantineProvider>,
    );

    expect(
      html.match(new RegExp(`href="${productionLoginUrl}"`, "g")),
    ).toHaveLength(2);
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

  it("keeps all 18 accordion values aligned with their question wording", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <FaqSection
          billingPortalLoginUrl={productionLoginUrl}
          compactProof={<div>Preview experience</div>}
          CheckoutForm={PreviewCheckoutForm}
        />
      </MantineProvider>,
    );
    const questions = [
      "Who works on my issues?",
      "How does pricing work?",
      "How do I scale up or down?",
      "How do I manage in-progress issues?",
      "How big should an issue be?",
      "What kinds of issues can I assign?",
      "What if an issue is out of scope?",
      "How is AI used?",
      "Can you use our existing AI tools and workflows?",
      "Can you work in our existing systems?",
      "How does collaboration work?",
      "What if a PR needs changes?",
      "Who owns the code?",
      "Is there a minimum commitment?",
      "How do I pause or cancel?",
      "How does the first-week guarantee work?",
      "Can I get a refund after the first week?",
      "How do I get started?",
    ];
    const values = Array.from(
      html.matchAll(/id="[^"]*-control-([a-z0-9-]+)"/g),
      (match) => match[1],
    );
    expect(values).toEqual(
      questions.map((question) =>
        question
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      ),
    );
    expect(new Set(values).size).toBe(18);
    for (const question of questions) expect(html).toContain(question);
  });

  it("places injected experience proof before the unchanged answer on home and welcome", () => {
    for (const variant of ["home", "welcome"] as const) {
      const html = renderToStaticMarkup(
        <MantineProvider>
          {variant === "home" ? (
            <FaqSection
              billingPortalLoginUrl={productionLoginUrl}
              compactProof={<div>Preview experience</div>}
              CheckoutForm={PreviewCheckoutForm}
            />
          ) : (
            <FaqSection
              billingPortalLoginUrl={productionLoginUrl}
              compactProof={<div>Preview experience</div>}
              variant="welcome"
            />
          )}
        </MantineProvider>,
      );
      expect(html.indexOf("Preview experience")).toBeLessThan(
        html.indexOf("AJ Welch is a staff data engineer"),
      );
      expect(html).toContain(
        "He works directly on your issues and there are no agency PMs, junior handoffs, or offshore teams.",
      );
    }
  });
});
