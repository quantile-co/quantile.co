import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { Container, MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { theme } from "@/app/theme";
import headerClasses from "@/components/Header/Header.module.css";
import Article from "../newsletter/[slug]/page";
import ConsultingPage from "./page";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/lib/newsletter", () => ({
  getNewsletterArticle: async () => ({
    slug: "example",
    title: "Article title reference",
    subtitle: "Practical engineering notes for data leaders.",
    date: "2026-10-01",
    contributor: {
      name: "AJ Welch",
      image: "/images/contributors/aj-welch.webp",
    },
    image: "/images/newsletter/placeholder-01.svg",
    imageAlt: "Example cover",
    placeholder: true,
    content: "Article content.",
  }),
  getNewsletterArticles: async () => [],
}));

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
  it(`unifies consulting with article widths and signup styling in ${colorScheme} mode`, async () => {
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
        <div data-consulting>
          <ConsultingPage />
        </div>
        <div
          data-article-reference
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 0,
            overflow: "hidden",
            visibility: "hidden",
          }}
        >
          {await Article({ params: Promise.resolve({ slug: "example" }) })}
        </div>
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(
        container.querySelector("[data-consulting] footer"),
      ).not.toBeNull(),
    );
    await document.fonts.ready;
    const consulting = container.querySelector(
      "[data-consulting]",
    ) as HTMLElement;
    const reference = container.querySelector(
      "[data-article-reference]",
    ) as HTMLElement;
    const main = consulting.querySelector("main") as HTMLElement;
    const letter = main.querySelector(
      "article[aria-labelledby]",
    ) as HTMLElement;
    const title = main.querySelector("h1") as HTMLElement;
    const heading = title.parentElement as HTMLElement;
    const portrait = heading.querySelector("img") as HTMLImageElement;
    const opening = letter.querySelector(":scope > p") as HTMLElement;
    const footer = letter.querySelector("footer") as HTMLElement;
    const form = footer.querySelector("form") as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const button = form.querySelector("button") as HTMLButtonElement;
    const referenceArticle = reference.querySelector("article") as HTMLElement;
    const referenceTitle = reference.querySelector("h1") as HTMLElement;
    const referenceFooter = reference.querySelector("footer") as HTMLElement;
    const referenceInput = referenceFooter.querySelector(
      "input",
    ) as HTMLInputElement;
    const booking = letter.querySelector(
      '[data-site-cta="booking"]',
    ) as HTMLElement;

    expect(consulting.querySelector("aside")).toBeNull();
    expect(
      consulting.querySelector('[aria-label="Video introduction"]'),
    ).toBeNull();
    expect(consulting.textContent).not.toMatch(/P\.S\.|sidebar/);
    expect(heading.textContent).toBe("Hi, I’m AJ.");
    expect(heading.querySelector("a")).toBeNull();
    expect(
      consulting.querySelectorAll('img[alt="Portrait of AJ Welch"]'),
    ).toHaveLength(1);
    expect(consulting.querySelectorAll("form")).toHaveLength(1);
    expect(footer.querySelector("h2")?.textContent).toBe(
      "The AI newsletter for data leaders.",
    );
    expect(opening.textContent).toBe(
      "I’ve been a software engineer for over 15 years at:",
    );
    expect(
      consulting.querySelectorAll('a[href="mailto:aj@quantile.co"]'),
    ).toHaveLength(1);

    for (const width of [
      320, 321, 375, 390, 425, 500, 575, 576, 577, 660, 720, 767, 768, 769, 800,
      992, 1024, 1200, 1440, 1920,
    ]) {
      await page.viewport(width, 900);
      window.scrollTo(0, 0);
      const letterBox = letter.getBoundingClientRect();
      const referenceBox = referenceArticle.getBoundingClientRect();
      const headingBox = heading.getBoundingClientRect();
      const portraitBox = portrait.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const siteHeaderBox = (
        container.querySelector("header.mantine-Container-root") as HTMLElement
      ).getBoundingClientRect();
      for (const edge of ["left", "right", "width"] as const) {
        expect(letterBox[edge]).toBeCloseTo(referenceBox[edge], 1);
        expect(headingBox[edge]).toBeCloseTo(letterBox[edge], 1);
        expect(footer.getBoundingClientRect()[edge]).toBeCloseTo(
          letterBox[edge],
          1,
        );
      }
      expect(main.getBoundingClientRect().width).toBeLessThanOrEqual(800);
      if (width >= 992) expect(letterBox.width).toBe(752);
      const referenceTopGap =
        referenceTitle.getBoundingClientRect().top -
        (reference.querySelector("main") as HTMLElement).getBoundingClientRect()
          .top;
      expect(headingBox.top - siteHeaderBox.bottom).toBe(referenceTopGap);
      expect(referenceTopGap).toBe(64);
      const referenceText = document.createRange();
      referenceText.selectNodeContents(referenceTitle);
      const canvas = document.createElement("canvas").getContext("2d");
      if (!canvas) throw new Error("Canvas metrics unavailable");
      const referenceStyle = getComputedStyle(referenceTitle);
      canvas.font = `${referenceStyle.fontWeight} ${referenceStyle.fontSize} ${referenceStyle.fontFamily}`;
      const metrics = canvas.measureText("H");
      const referenceInkTop =
        referenceText.getClientRects()[0].top +
        metrics.fontBoundingBoxAscent -
        metrics.actualBoundingBoxAscent;
      const referenceMainTop = (
        reference.querySelector("main") as HTMLElement
      ).getBoundingClientRect().top;
      expect(
        Math.abs(
          portraitBox.top -
            siteHeaderBox.bottom -
            (referenceInkTop - referenceMainTop),
        ),
      ).toBeLessThan(1.5);
      const titleSize = parseFloat(getComputedStyle(title).fontSize);
      expect(portraitBox.width).toBeCloseTo(titleSize * 2, 1);
      expect(portraitBox.height).toBeCloseTo(titleSize * 2, 1);
      expect(portraitBox.left).toBe(letterBox.left);
      expect(titleBox.left).toBe(portraitBox.left);
      expect(titleBox.top - portraitBox.bottom).toBeCloseTo(20, 1);
      expect(opening.getBoundingClientRect().top - titleBox.bottom).toBeCloseTo(
        20,
        1,
      );
      expect(titleBox.right).toBeLessThanOrEqual(letterBox.right);
      expect(getComputedStyle(title).textBoxTrim).toBe("trim-start");
      expect(getComputedStyle(title).textBoxEdge).toBe("cap alphabetic");
      for (const property of [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
        "letterSpacing",
        "textWrap",
        "color",
      ] as const) {
        expect(getComputedStyle(title)[property]).toBe(
          getComputedStyle(referenceTitle)[property],
        );
      }
      const bodySize = width >= 768 ? 20 : 18;
      expect(getComputedStyle(opening).fontSize).toBe(`${bodySize}px`);
      expect(getComputedStyle(opening).fontWeight).toBe("400");
      expect(parseFloat(getComputedStyle(opening).lineHeight)).toBeCloseTo(
        bodySize * 1.55,
      );
      expect(getComputedStyle(opening).letterSpacing).toBe("normal");
      expect(opening.getBoundingClientRect().top).toBeGreaterThan(
        headingBox.bottom,
      );
      expect(opening.getBoundingClientRect().left).toBe(letterBox.left);
      expect(opening.getBoundingClientRect().width).toBe(letterBox.width);
      const proof = letter.querySelector(
        'section[aria-label="Company experience and client work"]',
      ) as HTMLElement;
      expect(proof.querySelectorAll("article:not([aria-hidden])")).toHaveLength(
        3,
      );
      for (const card of proof.querySelectorAll("[data-company]")) {
        const [companyHeader, details] = card.children;
        const [byline, clients] = details.children;
        const above =
          byline.getBoundingClientRect().top -
          companyHeader.getBoundingClientRect().bottom;
        const below =
          clients.getBoundingClientRect().top -
          byline.getBoundingClientRect().bottom;
        expect(above).toBeCloseTo(3, 1);
        expect(below).toBeCloseTo(above, 1);
      }
      expect(proof.getBoundingClientRect().top).toBeGreaterThan(
        opening.getBoundingClientRect().bottom,
      );
      const columns = [
        ...letter.querySelectorAll<HTMLUListElement>(":scope > div > ul"),
      ];
      expect(columns).toHaveLength(2);
      for (const column of columns) {
        expect(column.children).toHaveLength(5);
        expect(getComputedStyle(column).fontSize).toBe("18px");
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
      expect(booking.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        Math.max(first.bottom, second.bottom),
      );
      expect(booking.getBoundingClientRect().right).toBeCloseTo(
        letterBox.right,
        1,
      );
      expect(footer.getBoundingClientRect().top).toBeGreaterThan(
        booking.getBoundingClientRect().bottom,
      );
      for (const property of [
        "paddingTop",
        "paddingBottom",
        "borderTopWidth",
        "borderTopStyle",
        "borderTopColor",
        "textAlign",
      ] as const) {
        expect(getComputedStyle(footer)[property]).toBe(
          getComputedStyle(referenceFooter)[property],
        );
      }
      expect(getComputedStyle(footer).borderTopWidth).toBe("1px");
      const inputBox = input.getBoundingClientRect();
      expect(inputBox.width).toBe(referenceInput.getBoundingClientRect().width);
      expect(inputBox.height).toBe(42);
      expect(
        Math.abs(
          inputBox.left +
            inputBox.width / 2 -
            letterBox.left -
            letterBox.width / 2,
        ),
      ).toBeLessThan(1);
      expect(button.getBoundingClientRect().right).toBeLessThan(inputBox.right);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
    input.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    expect(input.checkValidity()).toBe(false);
    await userEvent.fill(input, "reader@example.com");
    expect(input.checkValidity()).toBe(true);
    const submit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
  });
}
