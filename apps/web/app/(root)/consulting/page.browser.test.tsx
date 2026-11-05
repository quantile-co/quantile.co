import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { Container, MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { theme } from "@/app/theme";
import headerClasses from "@/components/Header/Header.module.css";
import ConsultingPage from "./page";

let container: HTMLDivElement;
let root: Root;
let initialViewport: { width: number; height: number };

afterEach(async () => {
  root?.unmount();
  container?.remove();
  window.scrollTo(0, 0);
  if (initialViewport) {
    await page.viewport(initialViewport.width, initialViewport.height);
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  it(`aligns the consulting layout and keeps only the desktop profile sticky in ${colorScheme} mode`, async () => {
    initialViewport = { width: window.innerWidth, height: window.innerHeight };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        <Container
          component="header"
          size="xl"
          px="var(--site-page-padding)"
          className={headerClasses.inner}
        >
          <span>Quantile</span>
          <nav>
            <a href="/consulting" className={headerClasses.link}>
              Consulting
            </a>
          </nav>
        </Container>
        <ConsultingPage />
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(
        container.querySelector('aside[aria-label="About AJ Welch"]'),
      ).not.toBeNull(),
    );
    await document.fonts.ready;
    expect(
      container.querySelector('[aria-label="Video introduction"]'),
    ).toBeNull();

    for (const width of [320, 390, 425, 576, 767, 768, 1024, 1440, 1920]) {
      await page.viewport(width, 900);
      window.scrollTo(0, 0);
      const header = container.querySelector(
        "header.mantine-Container-root",
      ) as HTMLElement;
      const profile = container.querySelector(
        'aside[aria-label="About AJ Welch"]',
      ) as HTMLElement;
      const letter = container.querySelector(
        'article[aria-labelledby="founder-letter-title"]',
      ) as HTMLElement;
      const headerBox = header.getBoundingClientRect();
      const headerStyle = getComputedStyle(header);
      const left = headerBox.left + parseFloat(headerStyle.paddingLeft);
      const headerText = document.createRange();
      headerText.selectNodeContents(header.querySelector("nav a") as Element);
      const right = headerText.getBoundingClientRect().right;
      const profileBox = profile.getBoundingClientRect();
      const letterBox = letter.getBoundingClientRect();
      expect(
        getComputedStyle(profile.querySelector("p") as HTMLElement).fontSize,
      ).toBe(
        getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
          .fontSize,
      );

      const introFontSize = parseFloat(
        getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
          .fontSize,
      );
      for (const detail of profile.querySelectorAll(
        "a, :scope > div:last-child > p",
      )) {
        expect(parseFloat(getComputedStyle(detail).fontSize)).toBeLessThan(
          introFontSize,
        );
      }

      expect(Math.abs(profileBox.left - left)).toBeLessThan(1);
      expect(letterBox.left).toBeGreaterThanOrEqual(left);
      expect(Math.abs(letterBox.right - right)).toBeLessThan(1);
      const booking = letter.querySelector(
        '[data-site-cta="booking"]',
      ) as HTMLElement;
      expect(booking.getBoundingClientRect().right).toBeLessThanOrEqual(
        right + 0.5,
      );
      expect(booking.getBoundingClientRect().left).toBeGreaterThanOrEqual(left);
      for (const block of letter.querySelectorAll(":scope > p, :scope > ul")) {
        expect(block.getBoundingClientRect().left).toBeGreaterThanOrEqual(left);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      const forms = [
        ...container.querySelectorAll<HTMLFormElement>("form"),
      ].filter((form) => form.getClientRects().length > 0);
      expect(forms).toHaveLength(1);
      expect(letter.contains(forms[0])).toBe(width < 768);
      const input = forms[0].querySelector("input") as HTMLElement;
      const submit = forms[0].querySelector("button") as HTMLElement;
      const inputBox = input.getBoundingClientRect();
      const submitBox = submit.getBoundingClientRect();
      expect(submitBox.left).toBeGreaterThan(inputBox.left);
      expect(submitBox.right).toBeLessThan(inputBox.right);
      expect(
        Math.abs(
          submitBox.top +
            submitBox.height / 2 -
            inputBox.top -
            inputBox.height / 2,
        ),
      ).toBeLessThan(1);
      if (width < 768) {
        const postscript = letter.querySelector(
          ":scope > div:last-child > p",
        ) as HTMLElement;
        const postscriptBox = postscript.getBoundingClientRect();
        expect(inputBox.width).toBeLessThan(postscriptBox.width);
        expect(
          Math.abs(
            inputBox.left +
              inputBox.width / 2 -
              postscriptBox.left -
              postscriptBox.width / 2,
          ),
        ).toBeLessThan(1);
      }

      if (width >= 768) {
        const prompt = profile.nextElementSibling?.querySelector(
          "p",
        ) as HTMLElement;
        expect(parseFloat(getComputedStyle(prompt).fontSize)).toBe(
          introFontSize,
        );
        expect(parseFloat(getComputedStyle(input).fontSize)).toBeLessThan(
          introFontSize,
        );
        const introductionText = document.createRange();
        introductionText.selectNodeContents(
          letter.querySelector(":scope > p") as HTMLElement,
        );
        expect(introductionText.getClientRects()).toHaveLength(1);
        expect(profileBox.right).toBeLessThan(letterBox.left);
        expect(Math.abs(profileBox.top - letterBox.top)).toBeLessThan(1);
        window.scrollTo(0, 600);
        await vi.waitFor(() =>
          expect(
            Math.abs(profile.getBoundingClientRect().top - profileBox.top),
          ).toBeLessThan(2),
        );
      } else {
        const portrait = (
          profile.querySelector("img") as HTMLElement
        ).getBoundingClientRect();
        const text = (
          profile.querySelector(":scope > div:last-child") as HTMLElement
        ).getBoundingClientRect();
        expect(portrait.right).toBeLessThan(text.left);
        expect(Math.abs(portrait.width - portrait.height)).toBeLessThan(1);
        const companySquare = (
          letter.querySelector("[data-company] > [data-company]") as HTMLElement
        ).getBoundingClientRect();
        expect(Math.abs(portrait.width - companySquare.width)).toBeLessThan(1);
        expect(
          Math.abs(
            text.top + text.height / 2 - portrait.top - portrait.height / 2,
          ),
        ).toBeLessThan(1);
        const email = profile.querySelector<HTMLAnchorElement>("a");
        expect(email?.getAttribute("href")).toBe("mailto:aj@quantile.co");
        const introduction = (
          letter.querySelector(":scope > p") as HTMLElement
        ).getBoundingClientRect();
        const experience = (
          profile.querySelector(":scope > div:last-child > p") as HTMLElement
        ).getBoundingClientRect();
        const gapAbove = introduction.top - experience.bottom;
        const gapBelow = companySquare.top - introduction.bottom;
        expect(Math.abs(gapAbove - 20)).toBeLessThan(1);
        expect(Math.abs(gapAbove - gapBelow)).toBeLessThan(1);
        expect(
          getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
            .fontSize,
        ).toBe(width <= 425 ? "22px" : "20px");
        expect(Math.abs(letterBox.left - left)).toBeLessThan(1);
        window.scrollTo(0, 600);
        await vi.waitFor(() =>
          expect(profile.getBoundingClientRect().bottom).toBeLessThan(0),
        );
      }
    }
  });
}
