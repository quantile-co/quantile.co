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
  it(`aligns the consulting layout and keeps the profile in normal document flow in ${colorScheme} mode`, async () => {
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
          className={`${headerClasses.inner} ${headerClasses.header}`}
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

    expect(container.textContent).not.toContain(
      "15+ years experience at Google, CompilerWorks, and Chartio.",
    );

    for (const width of [
      320, 321, 375, 425, 435, 500, 575, 576, 577, 660, 720, 767, 768, 769, 992,
      1024, 1200, 1440, 1920,
    ]) {
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
      const proof = letter.querySelector(
        'section[aria-label="Company experience and client work"]',
      ) as HTMLElement;
      await vi.waitFor(() =>
        expect(
          proof.querySelectorAll("article:not([aria-hidden])"),
        ).toHaveLength(3),
      );
      const headerBox = header.getBoundingClientRect();
      const headerStyle = getComputedStyle(header);
      const mainStyle = getComputedStyle(
        container.querySelector("main") as HTMLElement,
      );
      for (const side of ["paddingLeft", "paddingRight"] as const) {
        expect(
          Math.abs(parseFloat(mainStyle[side]) - parseFloat(headerStyle[side])),
        ).toBeLessThan(0.01);
      }
      const left = headerBox.left + parseFloat(headerStyle.paddingLeft);
      const headerText = document.createRange();
      headerText.selectNodeContents(header.querySelector("nav a") as Element);
      const right = headerText.getBoundingClientRect().right;
      const profileBox = profile.getBoundingClientRect();
      const letterBox = letter.getBoundingClientRect();
      expect(
        parseFloat(
          getComputedStyle(profile.querySelector("p") as HTMLElement).fontSize,
        ),
      ).toBeLessThanOrEqual(
        parseFloat(
          getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
            .fontSize,
        ),
      );

      expect(
        getComputedStyle(
          letter.querySelector(":scope > p > span:last-child") as HTMLElement,
        ).fontWeight,
      ).toBe("500");
      const introFontSize = parseFloat(
        getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
          .fontSize,
      );
      for (const detail of profile.querySelectorAll("a")) {
        expect(parseFloat(getComputedStyle(detail).fontSize)).toBeLessThan(
          introFontSize,
        );
      }

      const introPortrait = letter.querySelector(
        ":scope > p img",
      ) as HTMLElement;
      if (width >= 576) {
        expect(Math.abs(profileBox.left - left)).toBeLessThan(1);
        expect(introPortrait.getClientRects()).toHaveLength(0);
      } else {
        expect(profile.getClientRects()).toHaveLength(0);
      }
      expect(letterBox.left).toBeGreaterThanOrEqual(left);
      expect(Math.abs(letterBox.right - right)).toBeLessThan(1);
      const booking = letter.querySelector(
        '[data-site-cta="booking"]',
      ) as HTMLElement;
      const signature = booking.parentElement
        ?.previousElementSibling as HTMLElement;
      const signatureText = [...signature.children].map((line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        return range.getBoundingClientRect();
      });
      const signatureTextHeight =
        Math.max(...signatureText.map((line) => line.bottom)) -
        Math.min(...signatureText.map((line) => line.top));
      expect(booking.getBoundingClientRect().height).toBeLessThanOrEqual(
        signatureTextHeight,
      );
      expect(booking.getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
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
      expect(letter.contains(forms[0])).toBe(width < 576);
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
      if (width < 576) {
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

      const columns = [
        ...letter.querySelectorAll<HTMLUListElement>(":scope > div > ul"),
      ];
      expect(columns).toHaveLength(2);
      const bulletColumns = columns[0].parentElement as HTMLElement;
      const opening = bulletColumns.previousElementSibling as HTMLElement;
      const closing = bulletColumns.nextElementSibling as HTMLElement;
      expect(opening.tagName).toBe("P");
      expect(closing.tagName).toBe("P");
      expect(opening.textContent).toMatch(/^Lorem ipsum/);
      expect(closing.textContent).toMatch(/^Ut enim/);
      expect(letter.querySelectorAll(":scope > p")).toHaveLength(3);
      for (const paragraph of [opening, closing]) {
        const box = paragraph.getBoundingClientRect();
        expect(Math.abs(box.left - letterBox.left)).toBeLessThan(1);
        expect(Math.abs(box.right - letterBox.right)).toBeLessThan(1);
      }
      expect(closing.nextElementSibling?.contains(booking)).toBe(true);
      const [firstColumn, secondColumn] = columns.map((column) =>
        column.getBoundingClientRect(),
      );
      for (const column of columns) expect(column.children).toHaveLength(5);
      expect(opening.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        firstColumn.top,
      );
      expect(closing.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        Math.max(firstColumn.bottom, secondColumn.bottom),
      );
      expect(booking.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        closing.getBoundingClientRect().bottom,
      );
      expect(
        parseFloat(getComputedStyle(columns[0]).fontSize),
      ).toBeLessThanOrEqual(parseFloat(getComputedStyle(letter).fontSize));
      if (width >= 576) {
        expect(Math.abs(firstColumn.top - secondColumn.top)).toBeLessThan(1);
        expect(firstColumn.right).toBeLessThanOrEqual(secondColumn.left);
        expect(getComputedStyle(bulletColumns, "::before").content).toBe(
          "none",
        );
        expect(getComputedStyle(columns[1]).borderInlineStartWidth).toBe("0px");
        expect(
          Math.abs(
            secondColumn.left -
              firstColumn.right -
              parseFloat(getComputedStyle(bulletColumns).columnGap),
          ),
        ).toBeLessThan(0.1);
        expect(Math.abs(firstColumn.width - secondColumn.width)).toBeLessThan(
          0.1,
        );
        const prompt = profile.nextElementSibling?.querySelector(
          "p",
        ) as HTMLElement;
        expect(prompt.querySelector("br")).not.toBeNull();
        const promptText = document.createRange();
        promptText.selectNodeContents(prompt);
        const promptLines = [...promptText.getClientRects()].filter(
          (line) => line.width > 0,
        );
        expect(new Set(promptLines.map((line) => line.top)).size).toBe(2);
        const profileEmail = profile.querySelector("a") as HTMLElement;
        const promptBox = prompt.getBoundingClientRect();
        const portraitBox = (
          profile.querySelector("img") as HTMLElement
        ).getBoundingClientRect();
        for (const line of promptLines) {
          expect(line.left).toBeGreaterThanOrEqual(portraitBox.left);
          expect(line.right).toBeLessThanOrEqual(portraitBox.right);
        }
        for (const block of [profileEmail, prompt, input]) {
          const box = block.getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(portraitBox.left);
          expect(box.right).toBeLessThanOrEqual(portraitBox.right);
        }
        expect(Math.abs(inputBox.width - portraitBox.width)).toBeLessThan(1);
        const gapAbovePrompt =
          promptBox.top - profileEmail.getBoundingClientRect().bottom;
        const gapBelowPrompt = inputBox.top - promptBox.bottom;
        expect(Math.abs(gapAbovePrompt - gapBelowPrompt)).toBeLessThan(1);
        const promptFontSize = parseFloat(getComputedStyle(prompt).fontSize);
        for (const detail of profile.querySelectorAll("a")) {
          expect(promptFontSize).toBe(
            parseFloat(getComputedStyle(detail).fontSize),
          );
        }
        expect(parseFloat(getComputedStyle(input).fontSize)).toBeLessThan(
          promptFontSize,
        );
        const introductionText = document.createRange();
        introductionText.selectNodeContents(
          letter.querySelector(":scope > p > span:last-child") as HTMLElement,
        );
        expect(introductionText.getClientRects().length).toBeLessThanOrEqual(2);
        expect(
          getComputedStyle(letter.querySelector(":scope > p") as HTMLElement)
            .textWrap,
        ).toBe("balance");
        expect(profileBox.right).toBeLessThan(letterBox.left);
        expect(
          Math.abs(
            letterBox.left - profileBox.right - parseFloat(mainStyle.columnGap),
          ),
        ).toBeLessThan(1);
        expect(Math.abs(profileBox.top - letterBox.top)).toBeLessThan(1);
        const sidebar = profile.parentElement?.parentElement as HTMLElement;
        expect(getComputedStyle(sidebar).position).toBe("static");
        window.scrollTo(0, 600);
        await vi.waitFor(() =>
          expect(
            Math.abs(
              profile.getBoundingClientRect().top -
                (profileBox.top - window.scrollY),
            ),
          ).toBeLessThan(1),
        );
      } else {
        expect(secondColumn.top).toBeGreaterThanOrEqual(firstColumn.bottom);
        expect(
          getComputedStyle(columns[0].parentElement as HTMLElement, "::before")
            .content,
        ).toBe("none");
        const portrait = introPortrait.getBoundingClientRect();
        const introduction = (
          letter.querySelector(":scope > p") as HTMLElement
        ).getBoundingClientRect();
        const proofBox = proof.getBoundingClientRect();
        expect(Math.abs(portrait.width - portrait.height)).toBeLessThan(1);
        const caption = introPortrait.nextElementSibling as HTMLElement;
        expect(caption.textContent).toBe("AJ Welch");
        const captionBox = caption.getBoundingClientRect();
        const email = caption.nextElementSibling as HTMLAnchorElement;
        expect(email.textContent?.trim()).toBe("aj@quantile.co");
        expect(email.getAttribute("href")).toBe("mailto:aj@quantile.co");
        const emailBox = email.getBoundingClientRect();
        expect(emailBox.top).toBeGreaterThanOrEqual(captionBox.bottom);
        expect(Math.abs(emailBox.left - portrait.left)).toBeLessThan(1);
        expect(emailBox.bottom).toBeLessThanOrEqual(introduction.bottom);
        const emailText = document.createRange();
        emailText.selectNodeContents(email);
        expect(
          Math.abs(emailText.getBoundingClientRect().right - portrait.right),
        ).toBeLessThan(1);
        expect(captionBox.top).toBeGreaterThan(portrait.bottom);
        expect(
          Math.abs(
            captionBox.left +
              captionBox.width / 2 -
              portrait.left -
              portrait.width / 2,
          ),
        ).toBeLessThan(1);
        expect(captionBox.bottom).toBeLessThanOrEqual(introduction.bottom);
        expect(
          parseFloat(getComputedStyle(introPortrait).borderRadius),
        ).toBeLessThan(10);
        expect(captionBox.width).toBeLessThanOrEqual(portrait.width);
        const captionText = document.createRange();
        captionText.selectNodeContents(caption);
        expect(
          Math.abs(captionText.getBoundingClientRect().right - portrait.right),
        ).toBeLessThan(1);
        expect(captionText.getBoundingClientRect().left).toBeGreaterThanOrEqual(
          portrait.left,
        );
        expect(
          Math.abs(captionText.getBoundingClientRect().left - portrait.left),
        ).toBeLessThan(1);
        expect(portrait.bottom).toBeLessThanOrEqual(introduction.bottom);
        expect(Math.abs(proofBox.left - left)).toBeLessThan(1);
        expect(Math.abs(proofBox.top - introduction.bottom - 12)).toBeLessThan(
          1,
        );
        const introductionText = document.createRange();
        introductionText.selectNodeContents(
          letter.querySelector(":scope > p > span:last-child") as HTMLElement,
        );
        expect(introductionText.getClientRects().length).toBeLessThanOrEqual(3);
        expect(
          Math.abs(
            introductionText.getBoundingClientRect().bottom -
              emailText.getBoundingClientRect().bottom,
          ),
        ).toBeLessThan(3);
        for (const line of introductionText.getClientRects()) {
          if (line.bottom > emailBox.top && line.top < emailBox.bottom) {
            expect(line.left).toBeGreaterThan(emailBox.right);
          }
        }
        const portraitGroup = (
          introPortrait.parentElement as HTMLElement
        ).getBoundingClientRect();
        const copyBox = (
          letter.querySelector(":scope > p > span:last-child") as HTMLElement
        ).getBoundingClientRect();
        expect(Math.abs(portraitGroup.left - left)).toBeLessThan(1);
        expect(Math.abs(portrait.left - left)).toBeLessThan(1);
        expect(Math.abs(copyBox.left - portraitGroup.right - 16)).toBeLessThan(
          1,
        );
        expect(Math.abs(portrait.top - copyBox.top)).toBeLessThan(1);
        expect(copyBox.height).toBeGreaterThanOrEqual(portraitGroup.height);
        expect(copyBox.height - portraitGroup.height).toBeLessThan(3);
        expect(introFontSize).toBeGreaterThanOrEqual(19.5);
        expect(introFontSize).toBeLessThanOrEqual(24);
        expect(Math.abs(letterBox.left - left)).toBeLessThan(1);
        const visiblePortraits = [
          ...container.querySelectorAll('img[alt="Portrait of AJ Welch"]'),
        ].filter((image) => image.getClientRects().length > 0);
        expect(visiblePortraits).toHaveLength(1);
      }
    }
  });
}
