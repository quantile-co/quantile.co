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
    expect(html).toContain(">Thanks for subscribing!</h1>");
    expect(html.match(/Thanks for subscribing!/g)).toHaveLength(1);
    expect(html).toContain("your welcome email with next steps");
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
    expect(html).toMatch(/<section class="[^"]*welcome[^"]*"/);
    expect(html).toContain("How do I scale up or down?");
    expect(html).toContain("Check your welcome email for next steps");
    expect(html).toContain("book a free intro call above");
    expect(html).not.toContain(">Subscribe</button>");
    expect(html).not.toContain("book a free intro call below");
  });

  it("uses the shared site header and footer without indexing the page", () => {
    const html = render();
    expect(html).toContain('href="/#benefits"');
    expect(html).toContain('href="/#pricing"');
    expect(html).not.toContain('href="/#faq"');
    expect(html).toContain('form="subscription-checkout"');
    expect(html).toContain("Quantile LLC");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
