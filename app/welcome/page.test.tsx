import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";
import WelcomePage, { metadata } from "./page";

function render() {
  return renderToStaticMarkup(
    <MantineProvider>
      <WelcomePage />
    </MantineProvider>,
  );
}

describe("Welcome return page", () => {
  it("pairs a thank-you heading with Calendly and the existing email card", () => {
    const html = render();
    expect(html).toContain(">Thank you for subscribing!</h1>");
    expect(html.match(/Thank you for subscribing!/g)).toHaveLength(1);
    expect(html).toContain(
      "I&#x27;m looking forward to working with you and your team. Keep an eye out for your welcome email with next steps",
    );
    expect(html).toContain("schedule an intro call below");
    expect(html).not.toContain('href="#book-a-call">schedule');
    expect(html).toContain(
      'href="mailto:aj@quantile.co">get in touch by email</a>',
    );
    expect(html).toContain('href="#faq">FAQ</a>');
    expect(html).toContain("manage your subscription via the");
    expect(html).toContain(
      `href="${billingPortalLoginUrl}">billing portal</a>`,
    );
    expect(html).toContain("Calendly loading...");
    expect(html).toContain('id="book-a-call"');
    expect(html).toContain('href="mailto:aj@quantile.co"');
    expect(html).toContain("Prefer email?");
    expect(html).not.toContain(">Welcome</p>");
    expect(html).not.toContain("Sandbox purchase");
    expect(html).not.toContain("confirming your payment");
  });

  it("places the shared FAQ after the call and email options with welcome-specific next steps", () => {
    const html = render();
    expect(html.indexOf("Prefer email?")).toBeLessThan(
      html.indexOf('id="faq"'),
    );
    expect(html).toMatch(/<section[^>]*aria-label="FAQ"[^>]*id="faq"/);
    expect(html).not.toContain(">FAQ</h2>");
    expect(html).toContain("How do I scale up or down?");
    expect(html).toContain("Check your welcome email for next steps");
    expect(html).toContain("book a free intro call above");
    expect(html).not.toContain(">Subscribe</button>");
    expect(html).not.toContain("book a free intro call below");
  });

  it("shows only FAQ and Billing in the header and footer navigation", () => {
    const html = render();
    const header = html.slice(
      html.indexOf("<header"),
      html.indexOf("</header>"),
    );
    const footer = html.slice(html.indexOf("<footer"));
    for (const region of [header, footer]) {
      expect(region).toContain('href="#faq">FAQ</a>');
      expect(region).toContain(`href="${billingPortalLoginUrl}">Billing</a>`);
      expect(region).not.toContain("Benefits");
      expect(region).not.toContain("Pricing");
      expect(region).not.toContain("Book a call");
      expect(region).not.toContain("Start building");
    }
    expect(html).toContain("Quantile LLC");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
