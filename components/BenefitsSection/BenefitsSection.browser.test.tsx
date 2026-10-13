import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Browser layout tests need the site's typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Exercise the site's actual fonts and heading metrics.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Test the visual injected by the page's composition root.
import { BenefitsAnimationTwo } from "../BenefitsAnimation/BenefitsAnimationTwo";
import { BenefitsSection } from "./BenefitsSection";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return <form action="/storybook-checkout-preview">{children}</form>;
}

it("optically centers the expertise visual in the space after the rendered copy", async () => {
  const initialViewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const nativeMatchMedia = window.matchMedia.bind(window);
  const reducedMotion = nativeMatchMedia("(prefers-reduced-motion: reduce)");
  vi.spyOn(reducedMotion, "matches", "get").mockReturnValue(true);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === reducedMotion.media ? reducedMotion : nativeMatchMedia(query),
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    root.render(
      <MantineProvider theme={theme}>
        <BenefitsSection
          CheckoutForm={PreviewCheckoutForm}
          expertiseVisual={<BenefitsAnimationTwo />}
        />
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("[data-has-visual]")).not.toBeNull(),
    );
    await document.fonts.ready;
    for (const width of [768, 820, 960, 1023, 1024, 1200, 1440, 1920]) {
      await page.viewport(width, 1000);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const introduction =
        container.querySelector<HTMLElement>("[data-has-visual]");
      const scene = introduction?.querySelector<HTMLElement>(
        "[data-benefits-animation]",
      );
      if (!introduction || !scene) throw new Error("Missing expertise layout");
      const copy = introduction.firstElementChild;
      if (!copy) throw new Error("Missing section copy");
      const textRects = Array.from(copy.children).flatMap((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects());
      });
      const textRight = Math.max(...textRects.map((rect) => rect.right));
      const right = introduction.getBoundingClientRect().right;
      const visual = scene.getBoundingClientRect();
      const visualCenter = (visual.left + visual.right) / 2;
      expect(
        Math.abs(visualCenter - (textRight + right) / 2),
        `centering at ${width}px`,
      ).toBeLessThan(16);
      expect(visual.left, `copy clearance at ${width}px`).toBeGreaterThan(
        textRight,
      );
      expect(visual.right).toBeLessThanOrEqual(right);
      expect(visual.height).toBeLessThanOrEqual(290);
      if (width === 1024) expect(visual.width).toBeLessThanOrEqual(416);
      const header = scene
        .querySelector<HTMLElement>('[class*="issueIcon"]')
        ?.getBoundingClientRect();
      const card = scene
        .querySelector<HTMLElement>("[data-current]")
        ?.getBoundingClientRect();
      if (!header || !card)
        throw new Error("Missing visible animation content");
      const textCenter =
        (Math.min(...textRects.map((rect) => rect.top)) +
          Math.max(...textRects.map((rect) => rect.bottom))) /
        2;
      // Allow the small downward optical nudge for top-weighted card copy,
      // while measuring visible content rather than the animation travel box.
      expect(
        Math.abs((header.top + card.bottom) / 2 - textCenter),
        `vertical alignment at ${width}px`,
      ).toBeLessThan(16);
    }
    for (const width of [320, 375, 425, 480, 600, 767]) {
      await page.viewport(width, 1000);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const introduction =
        container.querySelector<HTMLElement>("[data-has-visual]");
      const subtitle = introduction
        ?.querySelector("p")
        ?.getBoundingClientRect();
      const header = introduction
        ?.querySelector('[class*="issueIcon"]')
        ?.getBoundingClientRect();
      const card = introduction
        ?.querySelector("[data-current]")
        ?.getBoundingClientRect();
      const scene = introduction
        ?.querySelector("[data-benefits-animation]")
        ?.getBoundingClientRect();
      const heading = introduction
        ?.querySelector("h2")
        ?.getBoundingClientRect();
      const steps = introduction?.parentElement
        ?.querySelector("ol")
        ?.getBoundingClientRect();
      if (!subtitle || !header || !card || !steps || !scene || !heading)
        throw new Error("Missing mobile layout");
      expect(scene.left, `visual aligned with copy at ${width}px`).toBeCloseTo(
        heading.left,
        0,
      );
      expect(card.left, `card aligned with copy at ${width}px`).toBeCloseTo(
        heading.left,
        0,
      );
      expect(card.right, `card reaches copy edge at ${width}px`).toBeCloseTo(
        scene.right,
        0,
      );
      expect(header.left, `thread header aligned at ${width}px`).toBeCloseTo(
        heading.left,
        0,
      );
      const above = header.top - subtitle.bottom;
      const below = steps.top - card.bottom;
      expect(above).toBeGreaterThan(0);
      expect(below).toBeGreaterThan(0);
      expect(
        Math.abs(above - below),
        `balanced visible gaps at ${width}px`,
      ).toBeLessThan(4);
      for (const category of container.querySelectorAll<HTMLElement>(
        "section",
      )) {
        const style = getComputedStyle(category);
        const available =
          category.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight);
        for (const paragraph of category.querySelectorAll<HTMLElement>("p")) {
          expect(
            paragraph.getBoundingClientRect().width,
            `full-width copy at ${width}px`,
          ).toBeCloseTo(available, 0);
          expect(getComputedStyle(paragraph).textWrap).toBe("pretty");
        }
      }
    }
  } finally {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
    await page.viewport(initialViewport.width, initialViewport.height);
  }
});
