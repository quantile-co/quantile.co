import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

const liveLoginUrl =
  "https://billing.quantile.co/p/login/bJeeVe3TIaVO9ODfkn6AM00";
const sections = [{ href: "/#faq", label: "FAQ" }] as const;

describe("Site footer billing link", () => {
  it("links only from the footer to the shareable live login, not a session or test Portal", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <SiteFooter
          billingPortalLoginUrl={liveLoginUrl}
          homeHref="/"
          logo="Quantile"
          sections={sections}
          themeSwitcher={null}
        />
      </MantineProvider>,
    );

    expect(html.match(/>Billing<\/a>/g)).toHaveLength(1);
    expect(html).toContain(`href="${liveLoginUrl}"`);
    const footer = html.slice(html.indexOf("<footer"));
    expect(footer).toContain('aria-label="Footer"');
    expect(footer).toContain(`href="${liveLoginUrl}">Billing</a>`);
    expect(html).not.toContain("<header");
    expect(html).not.toContain("/p/session/");
  });
});
