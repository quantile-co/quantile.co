import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";
import NotFound from "./not-found";

function render() {
  return renderToStaticMarkup(
    <MantineProvider>
      <NotFound />
    </MantineProvider>,
  );
}

describe("Not found page", () => {
  it("offers a simple way home in the shared site chrome", () => {
    const html = render();
    const header = html.slice(
      html.indexOf("<header"),
      html.indexOf("</header>"),
    );
    const footer = html.slice(html.indexOf("<footer"));

    expect(html).toContain("<h1");
    expect(html).toContain(">Page not found.</h1>");
    expect(html).toContain(
      "We couldn’t find that page. Let&#x27;s get you back home.",
    );
    expect(html).toContain('href="/">Back to home');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(header).toContain('href="/#book-a-call"');
    expect(header).toContain(
      '<form action="/api/stripe/checkout" method="post">',
    );
    for (const region of [header, footer]) {
      for (const section of ["benefits", "pricing", "faq"]) {
        expect(region).toContain(`href="/#${section}"`);
      }
      expect(region).toContain('aria-label="Quantile home"');
    }
    expect(footer).toContain(`href="${billingPortalLoginUrl}">Billing</a>`);
    expect(footer).toContain("Quantile LLC");
    expect(html).not.toContain("Calendly loading...");
  });
});
