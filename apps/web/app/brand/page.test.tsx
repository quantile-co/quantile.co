import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "../layout";
import BrandPage from "./page";

describe("brand asset preview descriptions", () => {
  it("distinguishes the asset variant from the color of its mark", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <BrandPage />
      </RootLayout>,
    );

    expect(html).toContain("<header");
    expect(html).toContain("<footer");
    expect(html.match(/data-site-cta="booking"/g)).toHaveLength(1);
    expect(html.match(/aria-label="Quantile home"/g)).toHaveLength(2);
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
