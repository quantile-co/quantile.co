import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BrandPage from "./page";

describe("brand asset preview descriptions", () => {
  it("distinguishes the asset variant from the color of its mark", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <BrandPage />
      </MantineProvider>,
    );

    expect(html).not.toMatch(
      /<header|data-site-cta|aria-label="Quantile home"/,
    );
    expect(html).toContain("Select a display theme");
    expect(html).not.toContain("Back to home");
    expect(html.match(/download=""/g)).toHaveLength(10);
    expect(html).toContain(
      'alt="Quantile logo, dark-background version: light mark on a dark background"',
    );
    expect(html).toContain(
      'alt="Quantile logo, light-background version: dark mark on a light background"',
    );
    expect(html).toContain(
      'alt="Quantile wordmark, dark-background version: light text on a dark background"',
    );
    expect(html).toContain(
      'alt="Quantile wordmark, light-background version: dark text on a light background"',
    );
  });
});
