import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Layout tests need the actual global styles.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Verify the actual dependencies injected by the page.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Test the injected skip link and its focus behavior.
import { SkipLink } from "@/components/SkipLink/SkipLink";
// biome-ignore lint/style/noRestrictedImports: Verify the actual dependencies injected by the page.
import * as SocialProof from "@/components/SocialProofSection/SocialProofSection";
// biome-ignore lint/style/noRestrictedImports: Verify the actual dependencies injected by the page.
import { ThemeSwitcher } from "@/components/ThemeSwitcher/ThemeSwitcher";
import { LetterLandingPage } from "./LetterLandingPage";

let container: HTMLDivElement;
let root: Root;
let initialViewport: { width: number; height: number };

async function renderPage(colorScheme: "light" | "dark") {
  initialViewport = { width: window.innerWidth, height: window.innerHeight };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider defaultColorScheme={colorScheme} theme={theme}>
      <LetterLandingPage
        skipLink={<SkipLink href="#main-content">Skip to content</SkipLink>}
        socialProof={
          <SocialProof.SocialProofSection
            flushCarousel
            ariaLabel="Experience"
          />
        }
        founderProfile={<SocialProof.FounderProfile />}
        themeSwitcher={<ThemeSwitcher />}
      />
    </MantineProvider>,
  );
  await vi.waitFor(() => expect(container.querySelector("h1")).not.toBeNull());
  await document.fonts.ready;
}

afterEach(async () => {
  root?.unmount();
  container?.remove();
  localStorage.removeItem("mantine-color-scheme-value");
  window.scrollTo(0, 0);
  if (initialViewport) {
    await page.viewport(initialViewport.width, initialViewport.height);
  }
});

describe("Founder-letter responsive layout", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    it(`keeps content aligned and unclipped in ${colorScheme} mode`, async () => {
      await renderPage(colorScheme);
      for (const width of [
        320, 390, 425, 576, 577, 660, 767, 768, 800, 959, 960, 1024, 1280, 1439,
        1440, 1920,
      ]) {
        await page.viewport(width, 900);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const letter = container.querySelector(
          "article[aria-labelledby]",
        ) as HTMLElement;
        const footer = container.querySelector("footer") as HTMLElement;
        expect(Number.parseFloat(getComputedStyle(footer).paddingTop)).toBe(8);
        const pageRoot = container.querySelector("#top") as HTMLElement;
        expect(
          Number.parseFloat(getComputedStyle(pageRoot).paddingTop),
        ).toBeCloseTo(Math.max(24, Math.min(width * 0.04, 48)), 0);
        const letterStyle = getComputedStyle(letter);
        const letterPadding = Number.parseFloat(letterStyle.paddingTop);
        expect(Number.parseFloat(letterStyle.paddingBottom)).toBe(0);
        if (width < 768) {
          expect(letterPadding).toBeCloseTo(
            Math.max(24, Math.min(width * 0.04, 32)),
            0,
          );
          const proof = container.querySelector(
            'section[aria-label="Experience"]',
          ) as HTMLElement;
          const card = proof.querySelector("[data-profile]") as HTMLElement;
          const square = card.querySelector(
            '[data-company="AJ Welch"]',
          ) as HTMLElement;
          expect(proof.getBoundingClientRect().height).toBeCloseTo(
            square.getBoundingClientRect().height,
            0,
          );
          expect(card.getBoundingClientRect().top).toBeCloseTo(
            square.getBoundingClientRect().top,
            0,
          );
        } else {
          expect(letterPadding).toBeCloseTo(
            Math.min(96, Math.max(48, width * 0.07)),
            0,
          );
        }
        const footerRect = footer.getBoundingClientRect();
        const letterRect = letter.getBoundingClientRect();
        const pagePadding = width <= 576 ? 20 : 24;

        expect(container.querySelector("header")).toBeNull();
        expect(container.querySelector("h2")).toBeNull();
        expect(footerRect.left, `left edge at ${width}px`).toBeCloseTo(
          letterRect.left,
          0,
        );
        expect(footerRect.width, `width at ${width}px`).toBeCloseTo(
          letterRect.width,
          0,
        );
        const cta = container.querySelector(
          'a[data-site-cta="letter"]',
        ) as HTMLAnchorElement;
        const email = container.querySelector(
          'a[href="mailto:aj@quantile.co"]',
        ) as HTMLAnchorElement;
        expect(cta.href).toBe("https://cal.com/aj-welch/book-a-call");
        expect(cta.target).toBe("_blank");
        expect(cta.relList.contains("noopener")).toBe(true);
        expect(cta.relList.contains("noreferrer")).toBe(true);
        const profile = footer.querySelector("[data-profile]") as HTMLElement;
        const profileRect = profile.getBoundingClientRect();
        const lastParagraph = letter.querySelector(
          "p:last-child",
        ) as HTMLElement;
        expect(
          Number.parseFloat(getComputedStyle(lastParagraph).marginBottom),
        ).toBeCloseTo(Number.parseFloat(letterStyle.fontSize) * 0.75, 1);
        const profileSquare = profile.querySelector(
          '[data-company="AJ Welch"]',
        ) as HTMLElement;
        expect(profileRect.height).toBeCloseTo(
          profileSquare.getBoundingClientRect().height,
          1,
        );
        const contactRect = cta.parentElement?.getBoundingClientRect();
        if (!contactRect) throw new Error("Missing contact block");
        const socialSquare = profile.querySelector(
          '[data-company="AJ Welch"]',
        ) as HTMLElement;
        expect(
          Number.parseFloat(getComputedStyle(cta).borderTopLeftRadius),
        ).toBe(
          Number.parseFloat(
            getComputedStyle(socialSquare).borderTopLeftRadius,
          ) + 2,
        );
        const ctaRect = cta.getBoundingClientRect();
        const emailRect = email.getBoundingClientRect();
        expect(profile.textContent).toContain("AJ Welch");
        expect(profile.querySelectorAll("a")).toHaveLength(0);
        expect(footer.textContent).not.toContain("— AJ");
        expect(footer.textContent).toContain("Prefer email?");
        expect(emailRect.top).toBeGreaterThanOrEqual(ctaRect.bottom);
        expect(
          Number.parseFloat(
            getComputedStyle(email.parentElement as HTMLElement).fontSize,
          ),
        ).toBe(14);
        if (width >= 768) {
          expect(profileRect.height).toBeLessThanOrEqual(
            contactRect.height + 0.1,
          );
          expect(profileRect.height).toBeCloseTo(contactRect.height - 4, 1);
          expect(profileRect.right).toBeLessThan(contactRect.left);
          expect(profileSquare.getBoundingClientRect().top).toBeCloseTo(
            ctaRect.top,
            1,
          );
          // Use the rendered font's ink metrics, not the email's padded line box.
          const range = document.createRange();
          range.selectNodeContents(email);
          const context = document.createElement("canvas").getContext("2d");
          if (!context) throw new Error("Missing canvas font metrics");
          const style = getComputedStyle(email);
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = context.measureText(email.textContent ?? "");
          const inkBottom =
            range.getBoundingClientRect().bottom -
            metrics.fontBoundingBoxDescent +
            metrics.actualBoundingBoxDescent;
          expect(
            profileSquare.getBoundingClientRect().bottom,
          ).toBeLessThanOrEqual(inkBottom);
          expect(
            inkBottom - profileSquare.getBoundingClientRect().bottom,
          ).toBeLessThanOrEqual(2);
          expect(emailRect.right).toBeCloseTo(ctaRect.right, 0);
        } else {
          expect(ctaRect.top - profileRect.bottom).toBeCloseTo(32, 0);
          expect(email.parentElement?.getBoundingClientRect().left).toBeCloseTo(
            ctaRect.left,
            0,
          );
        }
        expect(cta.getBoundingClientRect().height).toBeCloseTo(
          Math.max(48, Math.min(width * 0.05, 72)),
          0,
        );
        expect(cta.getBoundingClientRect().right).toBeLessThanOrEqual(
          width - pagePadding,
        );
        expect(email.getBoundingClientRect().right).toBeLessThanOrEqual(
          width - pagePadding,
        );
        expect(getComputedStyle(cta).color).not.toBe(
          getComputedStyle(cta).backgroundColor,
        );
        expect(container.querySelector("iframe")).toBeNull();
        expect(container.querySelector("#book-a-call")).toBeNull();
        expect(getComputedStyle(footer, "::before").content).toBe("none");
        expect(
          document.documentElement.scrollWidth,
          `page at ${width}px`,
        ).toBeLessThanOrEqual(width);
        expect(letter.scrollWidth, `letter at ${width}px`).toBeLessThanOrEqual(
          letter.clientWidth,
        );
        const proofs = container.querySelectorAll(
          'section[aria-label="Experience"], section[aria-label="Additional experience"]',
        );
        expect(proofs).toHaveLength(1);
        for (const card of proofs[0].querySelectorAll("article")) {
          const content = card.querySelector(
            '[class*="proofContent"]',
          ) as HTMLElement;
          const square = card.querySelector(
            '[class*="mediaSquare"]',
          ) as HTMLElement;
          expect(content.getBoundingClientRect().height).toBeCloseTo(
            square.getBoundingClientRect().height,
            0,
          );
          for (const text of card.querySelectorAll<HTMLElement>(
            '[class*="proofTitle"], [class*="profileRole"], [class*="profileDescription"], [class*="customerName"]',
          )) {
            expect(
              text.scrollWidth,
              `${text.textContent} at ${width}px`,
            ).toBeLessThanOrEqual(text.clientWidth + 1);
          }
          for (const child of content.children) {
            expect(
              child.getBoundingClientRect().bottom,
              `card content at ${width}px`,
            ).toBeLessThanOrEqual(content.getBoundingClientRect().bottom + 1);
          }
          if (width === 425) {
            expect(square.getBoundingClientRect().width).toBeCloseTo(93.5, 1);
          }
          if (width < 768) {
            expect(square.getBoundingClientRect().width).toBeGreaterThanOrEqual(
              83,
            );
            const title = card.querySelector(
              '[class*="proofTitle"]',
            ) as HTMLElement;
            expect(
              Number.parseFloat(getComputedStyle(title).fontSize),
            ).toBeGreaterThanOrEqual(19);
          }
        }
        const themeControl = footer.querySelector("fieldset") as HTMLElement;
        const themeRect = themeControl.getBoundingClientRect();
        expect(
          getComputedStyle(themeControl.parentElement as HTMLElement).position,
        ).toBe("fixed");
        expect(themeRect.right).toBeCloseTo(width - pagePadding, 0);
        expect(themeRect.bottom).toBeCloseTo(900 - pagePadding, 0);
        expect(
          footer.querySelector('a[aria-label="Quantile home"]'),
        ).toBeNull();
        expect(footer.textContent).not.toContain("©");
        expect(container.querySelector("form")).toBeNull();
        expect(
          container.querySelector('button[aria-label="Toggle navigation"]'),
        ).toBeNull();
        if (width >= 768) {
          const square = container.querySelector(
            '[data-profile] [data-company="AJ Welch"]',
          ) as HTMLElement;
          const expectedSquare =
            5.5 *
            Math.max(
              12,
              Math.min(
                19,
                (Math.min(width - 2 * pagePadding, 960) / 60) * 0.95,
              ),
            );
          expect(square.getBoundingClientRect().width).toBeCloseTo(
            expectedSquare,
            0,
          );
        }
      }
    });
  }

  it("scales all four enlarged cards proportionally between 960px and 1200px columns", async () => {
    await page.viewport(1440, 1000);
    await renderPage("light");
    const proof = container.querySelector(
      'section[aria-label="Experience"]',
    ) as HTMLElement;
    const scope = proof.parentElement as HTMLElement;
    function measureCards() {
      return [...proof.querySelectorAll("article")].map((card) => {
        const media = card.querySelector(
          '[class*="mediaSquare"]',
        ) as HTMLElement;
        const content = card.querySelector(
          '[class*="proofContent"]',
        ) as HTMLElement;
        const title = card.querySelector(
          '[class*="proofTitle"]',
        ) as HTMLElement;
        const logo = card.querySelector(
          '[class*="customerLogo"]',
        ) as HTMLElement | null;
        return {
          square: media.getBoundingClientRect().width,
          contentHeight: content.getBoundingClientRect().height,
          title: Number.parseFloat(getComputedStyle(title).fontSize),
          gap:
            content.getBoundingClientRect().left -
            media.getBoundingClientRect().right,
          logo: logo?.getBoundingClientRect().width,
        };
      });
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const narrow = measureCards();
    scope.style.setProperty("--site-content-width", "75rem");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const original = measureCards();
    expect(narrow).toHaveLength(4);
    for (let index = 0; index < 4; index++) {
      for (const key of ["square", "contentHeight", "title", "gap"] as const) {
        expect(narrow[index][key], `card ${index}: ${key}`).toBeCloseTo(
          original[index][key] * 0.8,
          0,
        );
      }
      if (narrow[index].logo && original[index].logo) {
        expect(narrow[index].logo).toBeCloseTo(
          (original[index].logo ?? 0) * 0.8,
          0,
        );
      }
    }
  });

  it("supports the external booking CTA, email link, skip link, and theme controls", async () => {
    await page.viewport(390, 844);
    await renderPage("light");
    const cta = container.querySelector(
      'a[data-site-cta="letter"]',
    ) as HTMLAnchorElement;
    expect(cta.href).toBe("https://cal.com/aj-welch/book-a-call");
    expect(cta.textContent).toContain("Let’s talk");
    expect(cta.getAttribute("aria-label")).toBe("Let’s talk — book a call");
    cta.focus();
    expect(document.activeElement).toBe(cta);
    const email = container.querySelector(
      'a[href="mailto:aj@quantile.co"]',
    ) as HTMLAnchorElement;
    expect(email.textContent).toBe("aj@quantile.co");
    const skip = container.querySelector(
      'a[href="#main-content"]',
    ) as HTMLAnchorElement;
    skip.focus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement?.id).toBe("main-content");
    const dark = container.querySelector(
      'input[aria-label="Dark"]',
    ) as HTMLInputElement;
    const darkLabel = container.querySelector(
      `label[for="${dark.id}"]`,
    ) as HTMLLabelElement;
    window.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() =>
      expect(
        getComputedStyle(
          darkLabel.parentElement?.parentElement?.parentElement as HTMLElement,
        ).pointerEvents,
      ).toBe("auto"),
    );
    await userEvent.click(darkLabel);
    await vi.waitFor(() => {
      expect(document.documentElement.dataset.mantineColorScheme).toBe("dark");
      expect(dark.checked).toBe(true);
    });
  });
});
