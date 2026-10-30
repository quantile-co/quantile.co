import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata as layoutMetadata } from "./layout";
import Home, { metadata } from "./page";

describe("Homepage positioning", () => {
  it("renders the founder letter and preserves the public data and AI metadata", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <Home />
      </RootLayout>,
    );

    expect(html.replace(/<[^>]+>/g, "")).toContain(
      "AI is transformational. So why is your data team still fighting the same fires?",
    );
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<section"));
    expect(html).toContain("Video coming soon");
    expect(html.indexOf('aria-label="Video introduction"')).toBeLessThan(
      html.indexOf('aria-labelledby="founder-letter-title"'),
    );
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<video");
    expect(html).toContain(
      "Hi, I’m AJ, and I’ve been a data engineer for over 15 years at:",
    );
    expect(html.indexOf("15 years at:")).toBeLessThan(
      html.indexOf('aria-label="Company experience'),
    );
    expect(html.indexOf('aria-label="Company experience')).toBeLessThan(
      html.indexOf("Over the years,"),
    );
    expect(html).toContain("And every change promised to be transformational.");
    expect(html).toContain("performance nightmares");
    expect(html).toContain("[Closing invitation]");
    expect(html).not.toContain("Portrait of AJ Welch");
    expect(html).toContain("$7k for 40 hours per month.");
    expect(html).toContain(
      "Fast, flexible, senior data + AI engineering capacity",
    );
    expect(metadata.title).toBe(
      "Quantile | Fractional data and AI engineering",
    );
    expect(metadata.description).toBe(
      "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.",
    );
    expect(layoutMetadata.title).toBe("Quantile");
    expect(layoutMetadata.metadataBase).toEqual(new URL("https://quantile.co"));
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
    expect(metadata.twitter).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });

    const jsonLd = html.match(
      /<script type="application\/ld\+json">([^<]*)<\/script>/,
    )?.[1];
    expect(JSON.parse(jsonLd ?? "")).toMatchObject({
      "@type": "Organization",
      name: "Quantile",
      url: "https://quantile.co",
      logo: "https://quantile.co/apple-icon.png",
      description: metadata.description,
    });

    expect(html).not.toContain("<form");
    expect(html).toContain("<header");
    expect(html).not.toContain("<h2");
    expect(html).toContain('href="https://cal.com/aj-welch/book-a-call"');
    expect(html).toContain('href="mailto:aj@quantile.co"');
    const footer = html.slice(
      html.indexOf("<footer"),
      html.indexOf("</footer>"),
    );
    expect(footer).toContain(`© ${new Date().getFullYear()} Quantile LLC`);
    expect(footer).not.toContain("data-profile");
    expect(html.match(/href="mailto:aj@quantile.co"/g)).toHaveLength(1);
    expect(html.match(/data-site-cta="booking"/g)).toHaveLength(2);
    expect(footer).toContain("<fieldset");
    expect(footer.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="#main-content"');
  });
});
