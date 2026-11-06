import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { theme } from "@/app/theme";
import Article from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));
vi.mock("@/lib/newsletter", () => ({
  getNewsletterArticle: async () => ({
    slug: "example",
    title: "AI-generated analysis needs a reviewable history",
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
  it(`keeps the byline and both signups readable and usable in ${colorScheme} mode`, async () => {
    initialViewport = { width: window.innerWidth, height: window.innerHeight };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        {await Article({ params: Promise.resolve({ slug: "example" }) })}
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")).not.toBeNull(),
    );
    await document.fonts.ready;

    const byline = container.querySelector("time")?.parentElement
      ?.parentElement as HTMLDivElement;
    const portrait = byline.querySelector("img") as HTMLImageElement;
    const name = byline.querySelector("span") as HTMLSpanElement;
    const date = byline.querySelector("time") as HTMLTimeElement;
    const summary = container.querySelector(
      "article header > p",
    ) as HTMLElement;
    const cover = container.querySelector("article > img") as HTMLImageElement;
    const forwarded = container.querySelector(
      'section[aria-labelledby="article-forwarded-title"]',
    ) as HTMLElement;
    const forwardedInput = forwarded.querySelector("input") as HTMLInputElement;
    const forwardedPrompt = forwarded.querySelector(
      "p",
    ) as HTMLParagraphElement;
    const footer = container.querySelector("article footer") as HTMLElement;
    const form = footer.querySelector("form") as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const button = form.querySelector("button") as HTMLButtonElement;
    expect(getComputedStyle(forwardedPrompt).fontSize).toBe(
      getComputedStyle(summary).fontSize,
    );
    expect(getComputedStyle(forwardedPrompt).lineHeight).toBe(
      getComputedStyle(summary).lineHeight,
    );
    expect(forwardedPrompt.textContent).toBe(
      "Was this forwarded to you? Get it straight to your inbox:",
    );
    expect(byline.textContent).toContain("AJ Welch");
    expect(byline.textContent).not.toContain("By AJ Welch");
    expect(Number.parseFloat(getComputedStyle(name).fontSize)).toBe(14);
    expect(byline.textContent).toContain("Oct 1, 2026");
    expect(portrait.alt).toBe("");
    expect(portrait.getAttribute("src")).toBe(
      "/images/contributors/aj-welch.webp",
    );

    for (const width of [
      320, 375, 480, 503, 504, 505, 512, 513, 520, 540, 576, 577, 660, 720, 744,
      768, 1024, 1440,
    ]) {
      await page.viewport(width, 900);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const element of [
        byline,
        forwarded,
        forwardedInput,
        footer,
        form,
        input,
        button,
      ]) {
        const bounds = element.getBoundingClientRect();
        expect(bounds.width).toBeGreaterThan(0);
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(width);
      }
      const bylineBox = byline.getBoundingClientRect();
      const nameBox = name.getBoundingClientRect();
      const dateBox = date.getBoundingClientRect();
      const summaryBox = summary.getBoundingClientRect();
      expect(portrait.getBoundingClientRect().width).toBe(24);
      expect(bylineBox.height).toBe(24);
      expect(dateBox.left).toBeGreaterThan(nameBox.right);
      expect(
        Math.abs(
          nameBox.top + nameBox.height / 2 - (dateBox.top + dateBox.height / 2),
        ),
      ).toBeLessThan(1);
      expect(bylineBox.left).toBe(summaryBox.left);
      expect(bylineBox.top - summaryBox.bottom).toBe(12);
      expect(forwardedInput.getBoundingClientRect().height).toBe(36);
      const promptBox = forwardedPrompt.getBoundingClientRect();
      const inputBox = forwardedInput.getBoundingClientRect();
      const availableWidth = forwarded.getBoundingClientRect().width;
      expect(getComputedStyle(forwardedPrompt).textAlign).toBe("start");
      if (availableWidth > 448) {
        expect(getComputedStyle(forwardedPrompt).textWrap).toBe("balance");
        expect(inputBox.right).toBe(forwarded.getBoundingClientRect().right);
        expect(inputBox.width).toBeGreaterThanOrEqual(208);
        expect(inputBox.width).toBeLessThan(
          forwarded.getBoundingClientRect().width,
        );
        expect(inputBox.left - promptBox.right).toBe(8);
        const textEdges = [...forwardedPrompt.querySelectorAll("span")].flatMap(
          (line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            return [...range.getClientRects()].map((rect) => rect.right);
          },
        );
        expect(inputBox.left - Math.max(...textEdges)).toBeCloseTo(8, 0);
        expect(
          Math.abs(
            inputBox.top +
              inputBox.height / 2 -
              (promptBox.top + promptBox.height / 2),
          ),
        ).toBeLessThan(1);
        const lineHeight = Number.parseFloat(
          getComputedStyle(forwardedPrompt).lineHeight,
        );
        expect(promptBox.height).toBe(
          availableWidth >= 688 ? lineHeight : lineHeight * 2,
        );
      } else {
        expect(getComputedStyle(forwardedPrompt).textWrap).toBe("balance");
        const sentences = forwardedPrompt.querySelectorAll("span");
        expect(sentences[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(
          sentences[0].getBoundingClientRect().bottom,
        );
        expect(inputBox.top - promptBox.bottom).toBe(8);
        expect(inputBox.left).toBe(forwarded.getBoundingClientRect().left);
        expect(inputBox.right).toBe(forwarded.getBoundingClientRect().right);
        expect(inputBox.width).toBe(availableWidth);
      }
      expect(input.getBoundingClientRect().height).toBe(42);
      expect(
        footer.getBoundingClientRect().bottom -
          input.getBoundingClientRect().bottom,
      ).toBe(16);
      expect(
        getComputedStyle(footer.closest("article") as HTMLElement)
          .paddingBottom,
      ).toBe("16px");
      const forwardedBox = forwarded.getBoundingClientRect();
      expect(forwardedBox.top - bylineBox.bottom).toBe(12);
      expect(cover.getBoundingClientRect().top - forwardedBox.bottom).toBe(12);
      expect(getComputedStyle(forwarded).borderTopWidth).toBe("1px");
      expect(getComputedStyle(forwarded).borderBottomWidth).toBe("1px");
      expect(footer.getBoundingClientRect().top).toBeGreaterThan(
        cover.getBoundingClientRect().bottom,
      );
    }

    const forms = [...container.querySelectorAll("article form")];
    expect(forms).toHaveLength(2);
    for (const [index, signup] of forms.entries()) {
      const email = signup.querySelector("input") as HTMLInputElement;
      const submitButton = signup.querySelector("button") as HTMLButtonElement;
      email.focus();
      expect(document.activeElement).toBe(email);
      await userEvent.tab();
      expect(document.activeElement).toBe(submitButton);
      expect(email.checkValidity()).toBe(false);
      await page
        .getByRole("textbox", { name: "Email address" })
        .nth(index)
        .fill("reader@example.com");
      expect(email.checkValidity()).toBe(true);
      const submit = new Event("submit", { bubbles: true, cancelable: true });
      signup.dispatchEvent(submit);
      expect(submit.defaultPrevented).toBe(true);
    }
  });
}
