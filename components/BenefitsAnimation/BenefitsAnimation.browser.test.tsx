import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Shared visual checks use the site's actual typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Use the actual application theme.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Exercise the visuals injected by the composition root.
import { BenefitsSection } from "../BenefitsSection/BenefitsSection";
// biome-ignore lint/style/noRestrictedImports: Compare visual weight across the standalone illustrations.
import { HeroAnimation } from "../HeroAnimation/HeroAnimation";
// biome-ignore lint/style/noRestrictedImports: Verify the real responsive hero layout.
import { HeroSection } from "../HeroSection/HeroSection";
// biome-ignore lint/style/noRestrictedImports: Verify spacing to the adjacent social proof section.
import { SocialProofSection } from "../SocialProofSection/SocialProofSection";
import { BenefitsAnimation1 } from "./BenefitsAnimation1";
import { BenefitsAnimation2 } from "./BenefitsAnimation2";
import { BenefitsAnimation3 } from "./BenefitsAnimation3";

const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
let container: HTMLDivElement;
let root: Root | undefined;
function element(selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

function CheckoutForm({ children }: { children: ReactNode }) {
  return <form action="/checkout-preview">{children}</form>;
}

beforeEach(() => {
  const preference = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
  }) as MediaQueryList;
  const nativeMatchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === preference.media ? preference : nativeMatchMedia(query),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  root?.unmount();
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
  window.scrollTo(0, 0);
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("Shared illustration styling", () => {
  it.each([
    "light",
    "dark",
  ] as const)("softens hero decoration while preserving title and completion contrast in %s mode", async (colorScheme) => {
    root?.render(
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <HeroAnimation />
      </MantineProvider>,
    );
    await vi.waitFor(() => expect(element("[data-task-card]")).toBeTruthy());
    await document.fonts.ready;
    for (const width of [320, 768, 1440]) {
      await page.viewport(width, 1000);
      await nextFrame();
      const style = (selector: string) => getComputedStyle(element(selector));
      const divider = style('[class*="checks"]').borderTopColor;
      const secondary = style('[class*="fileIcon"]').color;
      const mark = style("[data-merge-mark]");
      for (const selector of [
        "[data-task-card]",
        "[data-active-panel]",
        "[data-merged-panel]",
      ]) {
        expect(style(selector).borderTopColor).toBe(divider);
        expect(style(selector).borderTopWidth).toBe("1px");
      }
      for (const selector of [
        '[class*="columnLabel"]',
        '[class*="fileName"]',
        '[class*="changeCount"]',
      ])
        expect(style(selector).color).toBe(secondary);
      const lines = container.querySelectorAll<HTMLElement>(
        '[class*="codeLine"]',
      );
      expect(lines).toHaveLength(4);
      for (const line of lines) {
        expect(getComputedStyle(line).opacity).toBe("0.25");
        expect(getComputedStyle(line).backgroundColor).toBe(secondary);
      }
      expect(style('[class*="issueTitle"]').color).toBe(mark.backgroundColor);
      expect(mark.color).toBe(style("[data-task-card]").backgroundColor);
      expect(mark.fontWeight).toBe("700");
    }
  });

  it("shares a four-size type scale without changing hero heading-to-card spacing", async () => {
    root?.render(
      <MantineProvider theme={theme}>
        <div data-hero-preview style={{ maxWidth: 616, padding: 20 }}>
          <HeroAnimation />
        </div>
        <BenefitsSection
          CheckoutForm={CheckoutForm}
          onboardingVisual={<BenefitsAnimation1 />}
          expertiseVisual={<BenefitsAnimation2 />}
          capacityVisual={<BenefitsAnimation3 />}
        />
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(
        container.querySelector('[data-benefits-animation="two"]'),
      ).not.toBeNull(),
    );
    await document.fonts.ready;
    for (const width of [320, 390, 768, 820, 1024, 1440, 1920]) {
      await page.viewport(width, 1000);
      await nextFrame();
      const headings = [
        element("[data-hero-preview] > div > span"),
        element('[data-panel="backlog"] strong'),
        element('[data-benefits-animation="two"] > div:first-child strong'),
      ];
      const reference = getComputedStyle(headings[0]);
      for (const heading of headings.slice(1)) {
        const style = getComputedStyle(heading);
        for (const property of [
          "fontSize",
          "fontWeight",
          "lineHeight",
          "letterSpacing",
        ] as const)
          expect(style[property]).toBe(reference[property]);
        // Hero column labels are intentionally softer; card/benefit titles
        // retain primary contrast without changing the shared type scale.
        expect(style.color).toBe(
          getComputedStyle(element("[data-hero-preview] [data-task-card]"))
            .color,
        );
      }
      expect(reference.textTransform).toBe("uppercase");
      expect(reference.fontWeight).toBe("550");
      const titleSize = Number.parseFloat(reference.fontSize);
      expect(
        Number.parseFloat(
          getComputedStyle(element('[data-activity="0"] strong')).fontSize,
        ),
      ).toBe(titleSize - 2);
      expect(
        Number.parseFloat(
          getComputedStyle(element('[data-callout="start"]')).fontSize,
        ),
      ).toBe(
        titleSize - (width <= 425 || (width >= 768 && width < 1200) ? 4 : 3),
      );
      expect(
        Number.parseFloat(
          getComputedStyle(
            element(
              '[data-benefits-animation="two"] > div:first-child strong + span',
            ),
          ).fontSize,
        ),
      ).toBe(titleSize - 4);
      const card = element(
        '[data-initial-position="todo-1"]',
      ).getBoundingClientRect();
      const gap = card.top - headings[0].getBoundingClientRect().bottom;
      expect(gap, `hero heading gap at ${width}px`).toBeGreaterThanOrEqual(5.9);
      expect(gap, `hero heading gap at ${width}px`).toBeLessThanOrEqual(12.1);
      const heroWidth = element(
        "[data-hero-preview] > div",
      ).getBoundingClientRect().width;
      const expectedCardTitleSize = Math.max(
        11,
        Math.min(12, heroWidth * 0.02),
      );
      const mergeTitleStyle = getComputedStyle(
        element("[data-merged-panel] strong"),
      );
      expect(Number.parseFloat(mergeTitleStyle.fontSize)).toBeCloseTo(
        Math.max(9, Math.min(11, heroWidth * 0.019)),
        2,
      );
      expect(mergeTitleStyle.fontWeight).toBe("550");
      for (const title of container.querySelectorAll<HTMLElement>(
        "[data-hero-preview] [data-task-card] > span:first-child > span:first-child",
      )) {
        const box = title.closest("[data-task-card]")?.getBoundingClientRect();
        if (!box) throw new Error("Missing task card");
        expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          box.bottom,
        );
        const titleStyle = getComputedStyle(title);
        expect(
          Number.parseFloat(titleStyle.fontSize),
          `card title at ${width}px`,
        ).toBeCloseTo(expectedCardTitleSize, 2);
        expect(Number.parseFloat(titleStyle.fontSize)).toBeLessThan(titleSize);
        expect(Number.parseFloat(titleStyle.lineHeight)).toBeCloseTo(
          expectedCardTitleSize * 1.1,
          2,
        );
        expect(titleStyle.letterSpacing).toBe("normal");
        expect(titleStyle.fontWeight).toBe("550");
        expect(titleStyle.whiteSpace).toBe("nowrap");
      }
      expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    }
  });

  it.each([
    "light",
    "dark",
  ] as const)("balances responsive hero copy with the Kanban in %s mode", async (colorScheme) => {
    root?.render(
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <HeroSection
          CheckoutForm={CheckoutForm}
          title={"Fractional data\nand AI engineering"}
          description="Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches."
          visual={<HeroAnimation />}
        />
        <SocialProofSection ariaLabel="Hero proof spacing" />
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")).not.toBeNull(),
    );
    await document.fonts.ready;
    for (const width of [
      767, 768, 800, 801, 820, 832, 833, 960, 1023, 1024, 1088, 1089, 1200,
      1280, 1440, 1920, 2560,
    ]) {
      await page.viewport(width, 1000);
      await nextFrame();
      const title = element("h1");
      const description = element("h1 + p");
      const tablet = width >= 768 && width <= 1088;
      expect(Number.parseFloat(getComputedStyle(title).fontSize)).toBeCloseTo(
        tablet ? 48 : Math.max(48, Math.min(64, width * 0.05)),
        2,
      );
      expect(
        Number.parseFloat(getComputedStyle(description).fontSize),
      ).toBeCloseTo(tablet ? 16 : Math.max(18, Math.min(22, width * 0.017)), 2);
      for (const button of container.querySelectorAll<HTMLElement>(
        '[data-site-cta="hero"]',
      )) {
        expect(
          Number.parseFloat(getComputedStyle(button).fontSize),
        ).toBeCloseTo(
          Math.max(width >= 768 ? 13 : 14, Math.min(16, width * 0.01111)),
          2,
        );
        expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(
          36,
        );
      }
      const controls = element(
        '[data-site-cta="hero"]',
      ).parentElement?.getBoundingClientRect();
      if (!controls) throw new Error("Missing hero controls");
      expect(
        controls.top - description.getBoundingClientRect().bottom,
        `subtitle/CTA gap at ${width}px`,
      ).toBeCloseTo(
        width >= 768 ? Math.max(24, Math.min(32, width / 45)) : 32,
        1,
      );
      const content = title.parentElement?.getBoundingClientRect();
      const board =
        element("[data-task-card]").parentElement?.getBoundingClientRect();
      if (!content || !board) throw new Error("Missing hero layout");
      const cardTitle = element("[data-task-card] > span > span:first-child");
      expect(
        Number.parseFloat(getComputedStyle(cardTitle).fontSize),
      ).toBeCloseTo(
        width >= 768 && width <= 832 && board.width <= 416
          ? Math.max(10, Math.min(11, board.width * 0.028))
          : Math.max(11, Math.min(12, board.width * 0.02)),
        2,
      );
      if (width === 768) {
        const issueNumber = element(
          "[data-task-card] > span > span:nth-child(2) > span:first-child",
        );
        expect(getComputedStyle(issueNumber).fontSize).toBe("8px");
      }
      if (tablet) {
        expect(
          content.height / board.height,
          `copy/board balance at ${width}px`,
        ).toBeLessThan(1.25);
      }
      if ([768, 1024, 1440, 1920, 2560].includes(width)) {
        expect(
          board.height / content.height,
          `board too small at ${width}px`,
        ).toBeGreaterThanOrEqual(1);
        expect(
          board.height / content.height,
          `board too large at ${width}px`,
        ).toBeLessThan(1.3);
      }
      if (width >= 768) {
        const heroBounds = title.closest("section")?.getBoundingClientRect();
        const proofBounds = element(
          '[aria-label="Hero proof spacing"]',
        ).getBoundingClientRect();
        if (!heroBounds) throw new Error("Missing hero section");
        expect(
          heroBounds.height,
          `content-scaled hero at ${width}px`,
        ).toBeCloseTo(Math.min(768, (width - 48) * 0.64), 1);
        expect(proofBounds.top).toBeCloseTo(heroBounds.bottom, 1);
        const proofGap = proofBounds.top - board.bottom;
        if (width === 768) expect(proofGap).toBeCloseTo(90.4, 1);
        if (width >= 1440) expect(proofGap).toBeCloseTo(213.67, 1);
      }
      if (width === 768) expect(board.height).toBe(280);
      if (width === 1024) expect(board.height).toBeCloseTo(288.34, 1);
      if (width >= 1440) expect(board.width).toBe(672);
      if (width >= 768) {
        for (const copy of [title, description]) {
          const range = document.createRange();
          range.selectNodeContents(copy);
          for (const line of range.getClientRects()) {
            if (line.bottom > board.top && line.top < board.bottom) {
              expect(
                line.right + 8,
                `copy/board clearance at ${width}px`,
              ).toBeLessThanOrEqual(board.left);
            }
          }
        }
      }
      expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    }
  });
});
