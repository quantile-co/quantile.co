import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  Title,
} from "@mantine/core";
import classes from "./FaqSection.module.css";

type FaqSectionProps = {
  signUpFormId: string;
};

export function FaqSection({ signUpFormId }: FaqSectionProps) {
  const questions = [
    {
      value: "who-does-the-work",
      question: "Who works on my issues?",
      answer: (
        <p>
          AJ Welch is a staff data engineer with 15+ years of experience across
          Google, CompilerWorks, and Chartio. He works directly on your issues
          and there are no agency PMs, junior handoffs, or offshore teams.
        </p>
      ),
    },
    {
      value: "pricing",
      question: "How does pricing work?",
      answer: (
        <>
          <p>
            Pricing starts at $4,995 per month for one issue in progress at a
            time. As each issue is completed, work moves to the next issue in
            your backlog. This continues throughout the month.
          </p>
          <p>
            Your monthly rate scales with the number of issues you want in
            progress at once, not the number of issues or PRs completed
            throughout the course of the month.
          </p>
        </>
      ),
    },
    {
      value: "capacity",
      question: "How do I scale up or down?",
      answer: (
        <>
          <p>
            Adjust the number of in-progress issues on your subscription through
            Stripe.
          </p>
          <p>
            Upgrades take effect immediately, with a prorated charge for the
            remainder of your billing period. Downgrades take effect at the end
            of your current billing period, so you keep the capacity you've
            already paid for.
          </p>
        </>
      ),
    },
    {
      value: "issue-progress",
      question: "How do I manage in-progress issues?",
      answer: (
        <>
          <p>
            Your team decides how to mark issues as in progress, for example
            with an assignment, a label, or a board column.
          </p>
          <p>
            An issue remains in progress through development and code review. It
            is complete when a PR closes it.
          </p>
          <p>
            You can move blocked or deprioritized issues out of “in progress” to
            free up capacity for other work.
          </p>
        </>
      ),
    },
    {
      value: "larger-issues",
      question: "How big should an issue be?",
      answer: (
        <>
          <p>
            Aim for a focused piece of work rather than an entire project.
            Larger work can be broken into smaller issues that you can
            prioritize individually.
          </p>
          <p>
            One issue can span multiple PRs, but work proceeds one PR at a time,
            with PRs submitted sequentially.
          </p>
        </>
      ),
    },
    {
      value: "good-fit",
      question: "What kinds of issues can I assign?",
      answer: (
        <>
          <p>
            You can assign data engineering issues covering development,
            maintenance, support, and operations. Examples include:
          </p>
          <ul>
            <li>
              <strong>Analytics and modeling:</strong> dbt, pandas, Jupyter,
              etc.
            </li>
            <li>
              <strong>AI agents and workflows:</strong> LangChain, Pydantic AI,
              Anthropic SDKs, OpenAI SDKs, etc.
            </li>
            <li>
              <strong>Orchestration and transformation:</strong> Airflow,
              Prefect, Dagster, dbt, SQLMesh, etc.
            </li>
            <li>
              <strong>Storage and query processing:</strong> BigQuery,
              Snowflake, Databricks, ClickHouse, etc.
            </li>
            <li>
              <strong>Integration and streaming:</strong> Fivetran, Airbyte,
              dlt, Debezium, Kafka, Flink, etc.
            </li>
            <li>
              <strong>Performance optimization:</strong> Data platform, query,
              and pipeline tuning, etc.
            </li>
            <li>
              <strong>Observability and governance:</strong> Databricks Unity
              Catalog, Snowflake Horizon Catalog, GCP Dataplex, DataHub, Great
              Expectations, Langfuse, etc.
            </li>
            <li>
              <strong>Infrastructure and automation:</strong> AWS, GCP,
              Terraform, Pulumi, Docker, Kubernetes, etc.
            </li>
          </ul>
        </>
      ),
    },
    {
      value: "outside-scope",
      question: "What if an issue is out of scope?",
      answer: (
        <p>
          The issue is flagged before development starts. You can revise it to
          fit the scope or prioritize another issue from your backlog.
        </p>
      ),
    },
    {
      value: "ai-use",
      question: "How is AI used?",
      answer: (
        <p>
          AJ uses a multiplexed AI workflow to explore, build, and revise
          solutions. He handles complex design decisions, weighs tradeoffs, and
          resolves blockers, while coding agents speed up the implementation and
          take on the rote, low-level grunt work. That means less time spent on
          repetitive coding and more time spent on the efficiency, scalability,
          and maintainability of the solution.
        </p>
      ),
    },
    {
      value: "ai-workflows",
      question: "Can you use our existing AI tools and workflows?",
      answer: (
        <p>
          Yes, your existing AI tools, agents, software factories, and workflows
          can be used if you prefer.
        </p>
      ),
    },
    {
      value: "existing-stack",
      question: "Can you work in our existing systems?",
      answer: (
        <p>
          Yes. Work happens wherever you prefer, including your existing repos
          and infrastructure.
        </p>
      ),
    },
    {
      value: "communication",
      question: "How does collaboration work?",
      answer: (
        <>
          <p>
            Collaboration is async. Issues and PRs are updated daily with
            progress, next steps, and any blockers.
          </p>
          <p>
            An optional weekly 30-minute call is available for deeper technical
            discussions.
          </p>
        </>
      ),
    },
    {
      value: "revisions",
      question: "What if a PR needs changes?",
      answer: (
        <p>
          Request changes through code review. PRs are revised until they meet
          your team's standards and are approved and merged, with no limit on
          revisions.
        </p>
      ),
    },
    {
      value: "code-ownership",
      question: "Who owns the code?",
      answer: (
        <p>You own all submitted code, even after you pause or cancel.</p>
      ),
    },
    {
      value: "contracts",
      question: "Is there a minimum commitment?",
      answer: (
        <p>
          You can subscribe for just one month. There's no long-term contract,
          and you can pause or cancel anytime.
        </p>
      ),
    },
    {
      value: "pause-or-cancel",
      question: "How do I pause or cancel?",
      answer: (
        <>
          <p>
            Manage your subscription through Stripe. Pausing banks your
            remaining subscription time for when you return.
          </p>
          <p>
            Canceling stops renewal. Your subscription stays active until the
            end of your current billing period.
          </p>
        </>
      ),
    },
    {
      value: "first-week-guarantee",
      question: "How does the first-week guarantee work?",
      answer: (
        <p>
          Cancel within the first week and get 75% back, no questions asked.
        </p>
      ),
    },
    {
      value: "refunds",
      question: "Can I get a refund after the first week?",
      answer: (
        <p>
          Cancel within the first week and get 75% back, no questions asked.
          Subscription payments are non-refundable after the first week.
        </p>
      ),
    },
    {
      value: "getting-started",
      question: "How do I get started?",
      answer: (
        <>
          <p>
            <button
              className={classes.subscribeLink}
              form={signUpFormId}
              type="submit"
            >
              Subscribe
            </button>{" "}
            whenever you're ready via Stripe. You will receive a welcome email
            with next steps for sharing access and assigning and prioritizing
            issues.
          </p>
          <p>If you'd prefer to talk first, book a free intro call below.</p>
        </>
      ),
    },
  ];

  return (
    <section className={classes.section}>
      <Title className={classes.label} data-section-anchor id="faq" order={2}>
        FAQ
      </Title>

      <Container className={classes.wrapper} data-section-content size="xl">
        <div className={classes.accordionGrid}>
          {[questions.slice(0, 9), questions.slice(9)].map(
            (columnQuestions, columnIndex) => (
              <Accordion
                className={classes.accordion}
                key={columnIndex === 0 ? "first-column" : "second-column"}
                order={3}
                variant="default"
              >
                {columnQuestions.map((item) => (
                  <AccordionItem
                    className={classes.item}
                    key={item.value}
                    value={item.value}
                  >
                    <AccordionControl>{item.question}</AccordionControl>
                    <AccordionPanel className={classes.panel}>
                      {item.answer}
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            ),
          )}
        </div>
      </Container>
    </section>
  );
}
