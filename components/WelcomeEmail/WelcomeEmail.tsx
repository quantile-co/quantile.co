import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

type WelcomeEmailProps = {
  billingPortalLoginUrl: string;
  portraitUrl: string;
  quantity: number;
};

const colors = {
  background: "#fafafa",
  surface: "#ffffff",
  border: "#e4e4e7",
  text: "#09090b",
  muted: "#3f3f46",
};

const paragraph = {
  color: colors.muted,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 20px",
};

const link = {
  color: colors.text,
  textDecoration: "underline",
};

const item = {
  color: colors.muted,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 20px",
  paddingLeft: "6px",
};

const label = { color: colors.text };

export function WelcomeEmail({
  billingPortalLoginUrl,
  portraitUrl,
  quantity,
}: WelcomeEmailProps) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    throw new Error("Capacity must be an integer from 1 to 5.");
  }

  return (
    <Html lang="en">
      <Head />
      <Preview>Next steps for your Quantile subscription.</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container style={{ margin: "0 auto", maxWidth: "600px" }}>
          <Img
            alt="Quantile"
            height="55"
            src="https://quantile.co/images/brand/wordmark-light-1600.png"
            style={{ display: "block", margin: "0 auto 28px" }}
            width="160"
          />
          <Section
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "36px 32px",
            }}
          >
            <Heading
              as="h1"
              style={{
                color: colors.text,
                fontSize: "28px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: "34px",
                margin: "0 0 24px",
              }}
            >
              Thank you for subscribing!
            </Heading>
            <Text style={paragraph}>
              I&apos;m looking forward to working with you and your team.
              <br />
              <br />
              Here are a few ways to get started:
            </Text>
            <ol style={{ margin: "0 0 28px", paddingLeft: "24px" }}>
              <li style={item}>
                <strong style={label}>Share access.</strong> Please grant{" "}
                <Link href="mailto:aj@quantile.co" style={link}>
                  aj@quantile.co
                </Link>{" "}
                appropriate access to any necessary systems: GitHub, GitLab,
                Slack, Linear, AWS, GCP, etc.
              </li>
              <li style={item}>
                <strong style={label}>Assign issues.</strong> Assign as many
                issues as you&apos;d like using your team&apos;s preferred
                workflow. Ensure {quantity}{" "}
                {quantity === 1 ? "issue is" : "issues are"} marked in progress
                at a time.
              </li>
              <li style={item}>
                <strong style={label}>Schedule a call (optional).</strong> Feel
                free to{" "}
                <Link
                  href="https://calendly.com/aj-quantile/15min"
                  style={link}
                >
                  book an intro call
                </Link>{" "}
                to talk through priorities.
              </li>
              <li style={{ ...item, margin: 0 }}>
                <strong style={label}>Reach out by email (optional).</strong> If
                you prefer email, feel free to reply to this email or write to{" "}
                <Link href="mailto:aj@quantile.co" style={link}>
                  aj@quantile.co
                </Link>
                .
              </li>
            </ol>
            <Hr
              style={{
                borderTop: `1px solid ${colors.border}`,
                margin: "0 0 24px",
              }}
            />
            <Text style={{ ...paragraph, margin: 0 }}>
              <strong style={label}>Need to manage your subscription?</strong>{" "}
              Scale up, scale down, pause, or cancel in the{" "}
              <Link href={billingPortalLoginUrl} style={link}>
                billing portal
              </Link>
              .
            </Text>
            <Text style={{ ...paragraph, margin: "20px 0 0" }}>
              <strong style={label}>Have questions?</strong> Take a look at the{" "}
              <Link href="https://quantile.co/#faq" style={link}>
                FAQ
              </Link>
              , or email me directly at{" "}
              <Link href="mailto:aj@quantile.co" style={link}>
                aj@quantile.co
              </Link>
              .
            </Text>
            <Hr
              style={{
                borderTop: `1px solid ${colors.border}`,
                margin: "28px 0 24px",
              }}
            />
            <Text style={{ ...paragraph, color: colors.text, margin: 0 }}>
              Thanks again for subscribing. Can&apos;t wait to get started!
            </Text>
            <Row style={{ marginTop: "20px" }}>
              <Column
                style={{
                  paddingRight: "10px",
                  verticalAlign: "middle",
                  width: "68px",
                }}
              >
                <Img
                  alt="Portrait of AJ Welch"
                  height="64"
                  src={portraitUrl}
                  style={{
                    border: `2px solid ${colors.muted}`,
                    borderRadius: "4px",
                    display: "block",
                  }}
                  width="64"
                />
              </Column>
              <Column style={{ verticalAlign: "middle" }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: "18px",
                    fontWeight: 600,
                    lineHeight: "22px",
                    margin: "0 0 4px",
                  }}
                >
                  AJ Welch
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: "13px",
                    lineHeight: "18px",
                    margin: "0 0 4px",
                  }}
                >
                  Staff Data Engineer
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: "12px",
                    lineHeight: "17px",
                    margin: 0,
                  }}
                >
                  15+ years experience
                </Text>
              </Column>
            </Row>
          </Section>
          <Text
            style={{
              color: colors.muted,
              fontSize: "12px",
              lineHeight: "18px",
              margin: "24px 0 0",
              textAlign: "center",
            }}
          >
            Quantile LLC
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
