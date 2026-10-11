import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "react-email";
import { expect, within } from "storybook/test";
import { welcomeEmailPlainText } from "@/components/WelcomeEmail/plain-text";
import { WelcomeEmail } from "@/components/WelcomeEmail/WelcomeEmail";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";

const previewPortraitUrl = "/images/aj-welch-email.png";

const meta = {
  title: "Emails/Welcome",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function EmailPreview({ quantity }: { quantity: number }) {
  // Isolate the email's inline styles from Storybook's site theme.
  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <WelcomeEmail
      billingPortalLoginUrl={billingPortalLoginUrl}
      portraitUrl={previewPortraitUrl}
      quantity={quantity}
    />,
  )}`;
  return (
    <iframe
      srcDoc={html}
      style={{ border: 0, height: "100vh", width: "100%" }}
      title={`Welcome email for ${quantity} ${quantity === 1 ? "issue" : "issues"}`}
    />
  );
}

export const OneIssue: Story = {
  render: () => <EmailPreview quantity={1} />,
};

export const ThreeIssues: Story = {
  render: () => <EmailPreview quantity={3} />,
};

function PlainTextPreview({ quantity }: { quantity: number }) {
  const [text, setText] = useState("Rendering plain-text email...");

  useEffect(() => {
    let active = true;
    void render(
      <WelcomeEmail
        billingPortalLoginUrl={billingPortalLoginUrl}
        portraitUrl={previewPortraitUrl}
        quantity={quantity}
      />,
    )
      .then((html) => {
        if (active) setText(welcomeEmailPlainText(html));
      })
      .catch(() => {
        if (active) setText("Could not render email preview.");
      });
    return () => {
      active = false;
    };
  }, [quantity]);

  return (
    <div
      style={{
        backgroundColor: "#fafafa",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <pre
        style={{
          color: "#09090b",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 auto",
          maxWidth: "600px",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </pre>
    </div>
  );
}

export const OneIssueText: Story = {
  render: () => <PlainTextPreview quantity={1} />,
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        /1 issue is marked in progress at a time/,
      ),
    ).toBeInTheDocument();
  },
};

export const ThreeIssuesText: Story = {
  render: () => <PlainTextPreview quantity={3} />,
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        /3 issues are marked in progress at a time/,
      ),
    ).toBeInTheDocument();
  },
};
