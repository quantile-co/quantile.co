import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import proofClasses from "@/components/SocialProofSection/SocialProofSection.module.css";
import layoutClasses from "./layout.module.css";
import Home from "./page";
import { theme } from "./theme";

let container: HTMLDivElement;
let root: Root;
const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};

afterEach(async () => {
  root?.unmount();
  container?.remove();
  window.scrollTo(0, 0);
  await page.viewport(initialViewport.width, initialViewport.height);
});

for (const colorScheme of ["light", "dark"] as const) {
  it(`keeps the consulting-only homepage responsive in ${colorScheme} mode`, async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        <div className={layoutClasses.page}>
          <Home />
        </div>
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")).not.toBeNull(),
    );
    await document.fonts.ready;
    const main = container.querySelector("main") as HTMLElement;
    const letter = main.querySelector(
      "article[aria-labelledby]",
    ) as HTMLElement;
    const title = main.querySelector("h1") as HTMLElement;
    const heading = title.parentElement as HTMLElement;
    const portrait = heading.querySelector("img") as HTMLImageElement;
    const opening = letter.querySelector(":scope > p") as HTMLElement;
    const proof = letter.querySelector("section") as HTMLElement;
    const email = letter.querySelector(
      'a[href="mailto:aj@quantile.co"]',
    ) as HTMLAnchorElement;
    const booking = letter.querySelector(
      '[data-site-cta="booking"]',
    ) as HTMLAnchorElement;

    expect(container.querySelector("header, nav, form, aside")).toBeNull();
    expect(container.textContent).not.toMatch(
      /newsletter|P\.S\.|Video coming soon/i,
    );
    expect(title.textContent).toBe("Hi, I'm AJ.");
    expect(opening.textContent).toBe(
      "I've been a software and data engineer for over 15 years at:",
    );
    expect(
      container.querySelectorAll('img[alt="Portrait of AJ Welch"]'),
    ).toHaveLength(1);
    expect(proof.querySelectorAll("[data-company]")).toHaveLength(3);
    expect(booking.href).toBe("https://cal.com/aj-welch/book-a-call");
    expect(letter.querySelector("table")).toBeNull();
    expect(letter.textContent).not.toMatch(/Lorem ipsum|Ut enim/);
    const paragraphs = letter.querySelectorAll(":scope > p");
    expect(
      paragraphs[1].querySelector('a[href="https://dspy.ai/"]')?.textContent,
    ).toBe("DSPy");
    expect(
      paragraphs[1].querySelector('a[href="https://gepa-ai.github.io/gepa/"]')
        ?.textContent,
    ).toBe("GEPA");
    for (const link of paragraphs[1].querySelectorAll("a")) {
      expect(link.target).toBe("_blank");
      expect(link.relList.contains("noopener")).toBe(true);
      expect(link.relList.contains("noreferrer")).toBe(true);
    }

    for (const width of [
      320, 375, 425, 575, 576, 577, 767, 768, 800, 992, 1440, 1920,
    ]) {
      await page.viewport(width, 900);
      const letterBox = letter.getBoundingClientRect();
      const portraitBox = portrait.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      expect(main.getBoundingClientRect().width).toBeLessThanOrEqual(800);
      if (width >= 992) expect(letterBox.width).toBe(752);
      expect(main.getBoundingClientRect().top).toBe(width >= 1024 ? 48 : 64);
      expect(portraitBox.left).toBe(letterBox.left);
      expect(titleBox.left).toBe(letterBox.left);
      const titleSize = parseFloat(getComputedStyle(title).fontSize);
      expect(portraitBox.width).toBeCloseTo(titleSize * 2, 1);
      expect(portraitBox.height).toBeCloseTo(titleSize * 2, 1);
      expect(titleBox.top - portraitBox.bottom).toBeCloseTo(20, 1);
      expect(opening.getBoundingClientRect().top - titleBox.bottom).toBeCloseTo(
        20,
        1,
      );
      const bodySize = width >= 768 ? 20 : 18;
      expect(getComputedStyle(opening).fontSize).toBe(`${bodySize}px`);
      expect(parseFloat(getComputedStyle(opening).lineHeight)).toBeCloseTo(
        bodySize * 1.55,
      );
      expect(getComputedStyle(opening).letterSpacing).toBe("normal");

      const footer = container.querySelector("footer") as HTMLElement;
      const copyright = footer.querySelector("p") as HTMLElement;
      const themeControl = copyright.nextElementSibling as HTMLElement;
      expect(copyright.textContent).toBe(
        `© ${new Date().getFullYear()} Quantile LLC`,
      );
      expect(footer.querySelector('[aria-label="Quantile home"]')).toBeNull();
      for (const element of [copyright, themeControl]) {
        const box = element.getBoundingClientRect();
        const footerBox = footer.getBoundingClientRect();
        expect(box.left + box.width / 2).toBeCloseTo(
          footerBox.left + footerBox.width / 2,
          1,
        );
      }
      expect(themeControl.getBoundingClientRect().top).toBeGreaterThan(
        copyright.getBoundingClientRect().bottom,
      );
      const textBox = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect();
      };
      const signatureBottom = Math.max(
        textBox(email).bottom,
        textBox(email.previousElementSibling as Element).bottom,
        booking.getBoundingClientRect().bottom,
      );
      expect(
        Math.abs(textBox(copyright).top - signatureBottom - portraitBox.top),
      ).toBeLessThan(1);
      const textColor = getComputedStyle(opening).color;
      for (const element of proof.querySelectorAll("*")) {
        expect(getComputedStyle(element).color).toBe(textColor);
      }
      for (const logo of proof.querySelectorAll(
        `.${proofClasses.companyMarkImage}, .${proofClasses.customerLogo}`,
      )) {
        expect(getComputedStyle(logo).backgroundColor).toBe(textColor);
      }
      for (const frame of proof.querySelectorAll(
        `.${proofClasses.mediaSquare}`,
      )) {
        expect(getComputedStyle(frame).borderTopColor).toBe(textColor);
      }
      for (const card of proof.querySelectorAll("[data-company]")) {
        const [companyHeader, details] = card.children;
        const [byline, clients] = details.children;
        expect(
          byline.getBoundingClientRect().top -
            companyHeader.getBoundingClientRect().bottom,
        ).toBeCloseTo(3, 1);
        expect(
          clients.getBoundingClientRect().top -
            byline.getBoundingClientRect().bottom,
        ).toBeCloseTo(3, 1);
      }

      const columns = [
        ...letter.querySelectorAll(":scope > div > section[aria-labelledby]"),
      ];
      expect(columns).toHaveLength(2);
      expect(
        columns.map((column) => column.querySelector("h2")?.textContent),
      ).toEqual(["AI", "Data"]);
      for (const column of columns) {
        const columnHeading = column.querySelector("h2") as HTMLElement;
        const list = column.querySelector("ul") as HTMLElement;
        expect(column.getAttribute("aria-labelledby")).toBe(columnHeading.id);
        expect(list.children).toHaveLength(5);
        expect(getComputedStyle(list).fontSize).toBe(`${bodySize}px`);
        expect(getComputedStyle(columnHeading).fontSize).toBe(`${bodySize}px`);
        expect(columnHeading.getBoundingClientRect().bottom).toBeLessThan(
          list.getBoundingClientRect().top,
        );
      }
      const [first, second] = columns.map((column) =>
        column.getBoundingClientRect(),
      );
      if (width >= 576) {
        expect(first.top).toBe(second.top);
        expect(first.right).toBeLessThan(second.left);
      } else {
        expect(second.top).toBeGreaterThanOrEqual(first.bottom);
      }
      expect(booking.getBoundingClientRect().right).toBeCloseTo(
        letterBox.right,
        1,
      );
      expect(email.getBoundingClientRect().top).toBeLessThan(
        booking.getBoundingClientRect().bottom,
      );
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    email.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(booking);
  });
}
