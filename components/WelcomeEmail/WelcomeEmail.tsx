import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "react-email";

type WelcomeEmailProps = {
  quantity: number;
};

export function WelcomeEmail({ quantity }: WelcomeEmailProps) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    throw new Error("Capacity must be an integer from 1 to 5.");
  }

  return (
    <Html lang="en">
      <Head />
      <Preview>Next steps for your Quantile subscription.</Preview>
      <Body
        style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}
      >
        <Container style={{ maxWidth: "600px", padding: "24px" }}>
          <Heading as="h1">Welcome to Quantile</Heading>
          <Text>
            Thanks for subscribing to Quantile fractional data engineering.
          </Text>
          <Text>
            Your subscription includes capacity for {quantity} concurrent
            in-progress {quantity === 1 ? "issue" : "issues"}. This is
            concurrent capacity, not a monthly limit on completed issues or PRs.
          </Text>
          <Text>
            To get started, reply with your repository and issue-tracker links,
            your priorities, and any relevant context. Access can then be
            arranged using your team&apos;s invitation process. Don&apos;t send
            passwords or API keys by email.
          </Text>
          <Text>
            Your team can use its existing assignments, labels, or board columns
            to mark issues as in progress.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
