import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// biome-ignore lint/style/noRestrictedImports: Verify the route composition and public metadata together.
import { metadata as layoutMetadata } from "@/app/layout";
// biome-ignore lint/style/noRestrictedImports: Verify the route composition.
import Home, { metadata } from "@/app/page";

describe("Homepage positioning", () => {
  it("renders the founder letter and preserves the public data and AI metadata", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    expect(html).toContain("Your data shouldn’t slow you down.</h1>");
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
  });
});
