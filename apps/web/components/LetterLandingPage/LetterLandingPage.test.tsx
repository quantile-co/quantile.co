import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LetterLandingPage } from "./LetterLandingPage";

function renderPage() {
  return renderToStaticMarkup(
    <MantineProvider>
      <LetterLandingPage
        skipLink={<a href="#main-content">Skip to content</a>}
        socialProof={
          <section aria-label="Experience">Existing social proof</section>
        }
        founderProfile={
          <article aria-label="AJ Welch profile">AJ Welch profile</article>
        }
        themeSwitcher={
          <fieldset>
            <legend>Theme</legend>
          </fieldset>
        }
      />
    </MantineProvider>,
  );
}

describe("Founder-letter landing page", () => {
  it("keeps only the top social row, without an embedded calendar", () => {
    const html = renderPage();
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const letter = main.indexOf("<article");

    expect(main.match(/Existing social proof/g)).toHaveLength(1);
    expect(main.indexOf("Existing social proof")).toBeLessThan(letter);
    expect(main).not.toContain("<iframe");
    expect(main).not.toContain("calendly");
    expect(main.match(/<h1 /g)).toHaveLength(1);
    expect(main).toContain("we can start at");
    expect(main).toContain("$6k · 40hrs / month.");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Start building");
  });

  it("keeps the founder profile beside a CTA and email alternative, without branding or copyright", () => {
    const html = renderPage();
    const footer = html.slice(
      html.indexOf("<footer"),
      html.indexOf("</footer>"),
    );

    expect(html).not.toContain("<header");
    expect(html).toContain('href="https://cal.com/aj-welch/book-a-call"');
    expect(html).toContain('data-site-cta="letter"');
    expect(html).toContain('data-variant="filled"');
    expect(footer).toContain('aria-label="AJ Welch profile"');
    expect(footer).toContain("Prefer email?");
    expect(footer.indexOf('data-site-cta="letter"')).toBeLessThan(
      footer.indexOf("Prefer email?"),
    );
    expect(html).toContain('href="mailto:aj@quantile.co"');
    expect(html).not.toContain('href="#book-a-call"');
    expect(html).toContain("Let’s talk");
    expect(html).not.toContain("<nav");
    expect(footer.match(/<a /g)).toHaveLength(2);
    expect(footer.indexOf("AJ Welch profile")).toBeLessThan(
      footer.indexOf('data-site-cta="letter"'),
    );
    expect(footer).not.toContain("— AJ");
    expect(html).not.toContain('aria-label="Quantile home"');
    expect(html).not.toContain("© 2026 Quantile LLC");
    expect(footer).toContain("<fieldset>");
    expect(footer).toContain('href="https://cal.com/aj-welch/book-a-call"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="top"');
  });
});
