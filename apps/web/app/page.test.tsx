import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { metadata as layoutMetadata } from "./layout";
import Home, { metadata } from "./page";

describe("Homepage positioning", () => {
  it("renders the founder letter and preserves the public data and AI metadata", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    expect(html.replace(/<[^>]+>/g, "")).toContain(
      "Transform your data team with AI.",
    );
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<section"));
    expect(html).toContain("$6k · 40hrs / month.");
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
    expect(html).not.toContain("<header");
    expect(html).not.toContain("<h2");
    expect(html).toContain('href="https://cal.com/aj-welch/book-a-call"');
    expect(html).toContain('href="mailto:aj@quantile.co"');
    const footer = html.slice(
      html.indexOf("<footer"),
      html.indexOf("</footer>"),
    );
    expect(footer).toContain("AJ Welch");
    expect(html).not.toContain("Prefer email?");
    expect(html.match(/href="mailto:aj@quantile.co"/g)).toHaveLength(2);
    expect(footer).toContain("<fieldset");
    expect(footer.match(/<a /g)).toHaveLength(2);
    expect(html).toContain('href="#main-content"');
  });
});
