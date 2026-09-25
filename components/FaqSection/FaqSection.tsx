import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  Title,
} from "@mantine/core";
import classes from "./FaqSection.module.css";

const questions = [
  {
    value: "existing-stack",
    question: "Will you work with our existing systems?",
    answer:
      "Yes. Development happens in your existing repos, tools, cloud accounts, and data systems.",
  },
  {
    value: "good-fit",
    question: "What kinds of issues can I assign?",
    answer:
      "Issues can cover AI agents and RAG systems, data analytics, data orchestration and transformation, data storage and processing, data integration and streaming, data observability and governance, and related data platform work.",
  },
  {
    value: "outside-scope",
    question: "What happens if an issue is outside your scope?",
    answer:
      "The issue is flagged before development begins. You can revise it to fit our scope or prioritize another issue from the backlog.",
  },
  {
    value: "issue-backlog",
    question: "How are issues and active PRs managed?",
    answer:
      "The issue backlog is unlimited, with one active PR per subscription. Upon PR approval, development starts on the next prioritized issue. Additional subscriptions enable concurrent PR development.",
  },
  {
    value: "larger-issues",
    question: "How are large issues handled?",
    answer:
      "Large issues are split into smaller, reviewable PRs. Each PR is reviewed, revised, and approved before development on the next PR begins.",
  },
  {
    value: "turnaround",
    question: "What is the typical PR turnaround time?",
    answer:
      "Most PRs are ready for review in 2-3 business days. Complex issues may require more time and may be split into smaller, reviewable PRs.",
  },
  {
    value: "who-does-the-work",
    question: "Who does the work?",
    answer:
      "AJ Welch is a staff data engineer with 15+ years of experience across Google, CompilerWorks, and Chartio. He handles every issue from development through approval and is accountable for every line of code delivered. AI tools support development under direct human review. They are not used to run unattended agent swarms or mass-produce AI slop. Development is never outsourced, delegated to junior developers, or passed between rotating agency teams.",
  },
  {
    value: "communication",
    question: "How do we communicate?",
    answer:
      "Async collaboration happens in your existing tools, such as GitHub, GitLab, Linear, Jira, or Slack. One optional weekly call is available to use as you wish.",
  },
  {
    value: "revisions",
    question: "What if a PR is not approved?",
    answer:
      "Leave code review feedback and request revisions. Revisions continue until PR approval, with no limit on the number of revisions.",
  },
  {
    value: "code-ownership",
    question: "Who owns the code?",
    answer: "You own all submitted code, even after you pause or cancel.",
  },
  {
    value: "single-issue-or-month",
    question: "Can I subscribe for one issue or one month?",
    answer:
      "Yes. When the work is complete, pause to bank remaining time for later or cancel if you do not plan to return.",
  },
  {
    value: "contracts",
    question: "Are there any contracts or commitments?",
    answer:
      "No. The subscription is month to month, with no minimum term or long-term commitment.",
  },
  {
    value: "pause-or-cancel",
    question: "How does pausing or canceling work?",
    answer:
      "Pause to bank remaining time until you resume. Cancel without banking remaining time. Manage either option through Stripe.",
  },
  {
    value: "first-week-guarantee",
    question: "How does the one-week trial work?",
    answer:
      "Try the service for one week. If it is not a fit, request 75% back, no questions asked.",
  },
  {
    value: "refunds",
    question: "Are there any refunds?",
    answer:
      "A 75% refund is available during the one-week trial. After the first week, subscription payments are non-refundable.",
  },
  {
    value: "getting-started",
    question: "How do we get started?",
    answer:
      "If you would like an intro call, book a free call through Calendly below. Otherwise, select Start building and begin sharing access and assigning issues.",
  },
];

export function FaqSection() {
  return (
    <section className={classes.section}>
      <Title className={classes.label} data-section-anchor id="faq" order={2}>
        FAQ
      </Title>

      <Container className={classes.wrapper} data-section-content size="xl">
        <div className={classes.accordionGrid}>
          {[questions.slice(0, 8), questions.slice(8)].map(
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
