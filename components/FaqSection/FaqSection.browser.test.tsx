import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Browser layout test needs the app's typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Browser layout test uses the app's Mantine theme.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Exercise the real proof injected by the page composition root.
import { CompactSocialProof } from "../SocialProofSection/SocialProofSection";
import { FaqSection } from "./FaqSection";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return <form action="/storybook-checkout-preview">{children}</form>;
}

const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};

afterEach(async () => {
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("FAQ compact social proof layout", () => {
  it("fits the portrait, experience tile, and three labeled marks in one row", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      root.render(
        <MantineProvider theme={theme}>
          <FaqSection
            billingPortalLoginUrl="/portal-preview"
            compactProof={<CompactSocialProof />}
            CheckoutForm={PreviewCheckoutForm}
          />
        </MantineProvider>,
      );
      const control = await vi.waitFor(() => {
        const button = container.querySelector<HTMLButtonElement>(
          ".mantine-Accordion-control",
        );
        expect(button?.textContent).toBe("Who works on my issues?");
        return button as HTMLButtonElement;
      });
      control.click();

      const portrait = await vi.waitFor(() => {
        const image = container.querySelector<HTMLImageElement>(
          'img[alt="Portrait of AJ Welch"]',
        );
        expect(image?.getBoundingClientRect().width).toBeGreaterThan(0);
        return image as HTMLImageElement;
      });
      await document.fonts.ready;
      const panel = portrait.closest<HTMLElement>(".mantine-Accordion-panel");
      const strip = panel?.querySelector<HTMLElement>('[class*="compactGrid"]');
      const cards = Array.from(
        strip?.querySelectorAll<HTMLElement>('article[data-compact="true"]') ??
          [],
      );
      const tenure = strip?.querySelector<HTMLElement>(
        '[class*="compactTenure"]',
      );
      const copy = panel?.querySelector<HTMLElement>(
        ".mantine-Accordion-content > p",
      );
      expect(cards).toHaveLength(4);
      expect(cards.map((card) => card.getAttribute("data-company"))).toEqual([
        null,
        "Google",
        "CompilerWorks",
        "Chartio",
      ]);
      expect(tenure?.textContent).toBe("15+years ofexperience");
      expect(
        cards
          .slice(1)
          .map(
            (card) =>
              card.querySelector('[class*="compactCompanyName"]')?.textContent,
          ),
      ).toEqual(["Google", "CompilerWorks", "Chartio"]);
      expect(
        strip?.querySelectorAll('[class*="customerLogo"][style]'),
      ).toHaveLength(0);
      expect(strip?.querySelectorAll("a")).toHaveLength(0);
      expect(copy?.textContent).toContain("AJ Welch is a staff data engineer");

      for (const width of [320, 360, 390, 425, 465, 768, 1200]) {
        await page.viewport(width, 900);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const squareSize =
          width < 380 ? 44 : width < 460 ? 52 : width < 500 ? 64 : 72;
        const squares = [
          portrait.parentElement as HTMLElement,
          tenure as HTMLElement,
          ...cards
            .slice(1)
            .map((card) =>
              card.querySelector<HTMLElement>('[class*="mediaSquare"]'),
            ),
        ];
        const bounds = squares.map((square) => square?.getBoundingClientRect());
        const labels = cards
          .slice(1)
          .map((card) =>
            card.querySelector<HTMLElement>('[class*="compactCompanyName"]'),
          );
        for (let index = 0; index < squares.length; index++) {
          expect(bounds[index]?.width, `tile ${index} at ${width}px`).toBe(
            squareSize,
          );
          expect(bounds[index]?.top).toBeCloseTo(bounds[0]?.top ?? 0, 0);
          expect(
            getComputedStyle(squares[index] as HTMLElement).borderTopWidth,
          ).toBe("2px");
          if (index > 0) {
            expect(bounds[index]?.left).toBeGreaterThan(
              bounds[index - 1]?.right ?? 0,
            );
          }
        }
        for (const label of labels) {
          expect(label?.scrollWidth).toBeLessThanOrEqual(
            label?.clientWidth ?? 0,
          );
          expect(label?.getBoundingClientRect().top).toBeCloseTo(
            labels[0]?.getBoundingClientRect().top ?? 0,
            0,
          );
        }
        expect(strip?.scrollWidth, `strip at ${width}px`).toBeLessThanOrEqual(
          (strip?.clientWidth ?? 0) + 1,
        );
        expect(panel?.scrollWidth, `panel at ${width}px`).toBeLessThanOrEqual(
          (panel?.clientWidth ?? 0) + 1,
        );
        expect(copy?.getBoundingClientRect().top).toBeGreaterThan(
          strip?.getBoundingClientRect().bottom ?? 0,
        );
        expect(copy?.scrollWidth).toBeLessThanOrEqual(
          (copy?.clientWidth ?? 0) + 1,
        );
      }
    } finally {
      root.unmount();
      container.remove();
    }
  });
});
