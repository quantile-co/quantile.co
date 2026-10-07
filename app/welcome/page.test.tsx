import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
    expect(html).toContain(">Thanks for subscribing.</h1>");
    expect(html.match(/Thanks for subscribing\./g)).toHaveLength(1);
    expect(html).toContain("a welcome email with next steps");
    expect(html).toContain("feel free to book an intro call below");
    expect(html).toContain("Calendly loading...");
    expect(html).toContain('href="mailto:aj@quantile.co"');
    expect(html).toContain("Prefer email?");
    expect(html).not.toContain(">Welcome</p>");
    expect(html).not.toContain("Sandbox purchase");
    expect(html).not.toContain("confirming your payment");
  });

  it("uses the shared site header and footer without indexing the page", () => {
    const html = render();
    expect(html).toContain('href="/#benefits"');
    expect(html).toContain('href="/#pricing"');
    expect(html).toContain('href="/#faq"');
    expect(html).toContain('form="subscription-checkout"');
    expect(html).toContain("Quantile LLC");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
