import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { metadata as layoutMetadata } from "./layout";
import Home, { metadata } from "./page";

describe("Homepage positioning", () => {
  it("uses the data and AI engineering headline and supporting copy", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    expect(html).toContain("Fractional data\nand AI engineering</h1>");
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

    const forms = html.match(
      /<form\b[^>]*action="\/api\/stripe\/checkout"[^>]*method="post"[^>]*>/g,
    );
    expect(forms).toHaveLength(5);
    expect(html).not.toContain('form="subscription-checkout"');
  });
});
