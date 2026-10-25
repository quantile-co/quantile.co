import { render } from "react-email";
import { describe, expect, it } from "vitest";
import { welcomeEmailPlainText } from "./plain-text";
import { WelcomeEmail } from "./WelcomeEmail";

const billingPortalLoginUrl =
  "https://billing.quantile.co/p/login/bJeeVe3TIaVO9ODfkn6AM00";

describe("WelcomeEmail", () => {
  it.each([1, 2, 3, 4, 5])(
    "renders capacity %i as HTML and plain text",
    async (quantity) => {
      const html = await render(
        <WelcomeEmail
          billingPortalLoginUrl={billingPortalLoginUrl}
          portraitUrl="https://quantile.co/images/aj-welch-email.png"
          quantity={quantity}
        />,
      );
      const text = welcomeEmailPlainText(html);
      expect(html).toContain(">Thank you for subscribing!</h1>");
      expect(text).toMatch(/^Thank you for subscribing!/);
      expect(text).not.toContain("THANK YOU FOR SUBSCRIBING!");
      expect(text).not.toContain("fractional data engineering");
      expect(text.replace(/\s+/g, " ")).toContain(
        `Ensure ${quantity} ${quantity === 1 ? "issue is" : "issues are"} marked in progress at a time`,
      );
      expect(text).not.toContain("monthly cap");
      expect(text).not.toContain("As each issue is completed");
      expect(text).toContain(
        "Please grant aj@quantile.co appropriate access to any necessary systems",
      );
      expect(text).not.toContain("repo and issue-tracker links and priorities");
      expect(text).toContain(
        "Assign as many issues as you'd like using your team's preferred workflow",
      );
      expect(text).toContain("Feel free to book an intro call");
      expect(text).toContain("to talk through priorities.");
      expect(text).toContain(
        "If you prefer email, feel free to reply to this email or write to",
      );
      expect(text).toContain("GitHub, GitLab, Slack, Linear, AWS, GCP, etc.");
      expect(text).not.toContain("passwords or API keys");
      expect(text).not.toContain("—");
      expect(html).not.toContain("—");
      expect(text).toContain("Thanks again for subscribing.");
      expect(text).toContain("Can't wait to get started!");
      expect(text).toContain(
        "I'm looking forward to working with you and your team.\n\nHere are a few ways to get started:",
      );
      expect(text.indexOf("Here are a few ways to get started:")).toBeLessThan(
        text.indexOf("Can't wait to get started!"),
      );
      expect(html).toContain("<ol");
      expect(html.match(/<li\b/g)).toHaveLength(4);
      for (const number of [2, 3, 4]) {
        expect(text).toMatch(new RegExp(`\\n\\n\\s*${number}\\. `));
      }
      for (const [index, heading] of [
        "Share access.",
        "Assign issues.",
        "Schedule a call (optional).",
        "Reach out by email (optional).",
      ].entries()) {
        expect(text).toContain(`${index + 1}. ${heading}`);
      }
      expect(text).not.toContain("5. Have questions?");
      expect(text).not.toContain("Starting with");
      expect(text.indexOf("2. Assign issues.")).toBeLessThan(
        text.indexOf(
          `Ensure ${quantity} ${quantity === 1 ? "issue is" : "issues are"} marked in progress`,
        ),
      );
      expect(html).toContain("marked in progress at a time");
      expect(html.indexOf("marked in progress at a time")).toBeLessThan(
        html.indexOf("</ol>"),
      );
      expect(html.indexOf("</ol>")).toBeLessThan(
        html.indexOf("billing portal"),
      );
      expect(html.indexOf("billing portal")).toBeLessThan(
        html.indexOf("Have questions?"),
      );
      expect(html).toMatch(
        /<strong[^>]*>Need to manage your subscription\?<\/strong>/,
      );
      expect(text).toContain("Scale up, scale down, pause, or cancel");
      expect(html).toMatch(/<strong[^>]*>Have questions\?<\/strong>/);
      expect(html).toContain(
        'src="https://quantile.co/images/brand/wordmark-light-1600.png"',
      );
      expect(html).toContain('alt="Quantile"');
      expect(html).toContain(
        'src="https://quantile.co/images/aj-welch-email.png"',
      );
      expect(html).toContain('alt="Portrait of AJ Welch"');
      expect(text).toContain("AJ Welch");
      expect(text).toContain("Staff Data Engineer");
      expect(text).toContain("15+ years experience");
      expect(text).not.toContain("CompilerWorks");
      expect(html).toContain('href="mailto:aj@quantile.co"');
      expect(html).toContain('href="https://calendly.com/aj-quantile/15min"');
      expect(html).toContain(`href="${billingPortalLoginUrl}"`);
      expect(html).toContain('href="https://quantile.co/#faq"');
      expect(html).toContain("#fafafa");
      expect(html).toContain("#09090b");
      expect(html).toContain("border-top:1px solid #e4e4e7");
      expect(html).not.toContain("#f4f4f5");
      expect(html).not.toMatch(/<script|<form|<input/i);
    },
  );

  it.each([0, 6, -1, 1.5, Number.NaN])(
    "rejects invalid capacity %s",
    async (quantity) => {
      await expect(
        render(
          <WelcomeEmail
            billingPortalLoginUrl={billingPortalLoginUrl}
            portraitUrl="https://quantile.co/images/aj-welch-email.png"
            quantity={quantity}
          />,
        ),
      ).rejects.toThrow("Capacity must be an integer from 1 to 5.");
    },
  );
});
