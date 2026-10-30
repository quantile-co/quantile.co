import "@fontsource-variable/outfit";
import "./globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import Home from "./page";
import { theme } from "./theme";

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
      <Home />
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
    it(`keeps the letter and video unclipped in ${colorScheme} mode`, async () => {
      await renderPage(colorScheme);
      for (const width of [320, 425, 768, 1024, 1440, 1920]) {
        await page.viewport(width, 900);
        const heading = container.querySelector("h1") as HTMLElement;
        const proof = container.querySelector(
          'section[aria-label="Company experience and client work"]',
        ) as HTMLElement;
        await vi.waitFor(() =>
          expect(
            proof.querySelectorAll("article:not([aria-hidden])"),
          ).toHaveLength(width < 768 ? 1 : 3),
        );
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
        if (width <= 425 && CSS.supports("text-justify", "inter-character")) {
          expect(getComputedStyle(heading).textAlign).toBe("justify");
          expect(getComputedStyle(heading).textAlignLast).toBe("justify");
          expect(
            getComputedStyle(heading).getPropertyValue("text-justify"),
          ).toBe("inter-character");
        }
        expect(heading.querySelector("br, span")).toBeNull();
        expect(getComputedStyle(heading).fontFamily).toBe(
          getComputedStyle(document.body).fontFamily,
        );
        expect(getComputedStyle(heading).fontStyle).toBe("normal");
        expect(getComputedStyle(heading).color).toBe(
          getComputedStyle(document.body).color,
        );
        expect(getComputedStyle(heading).backgroundImage).toBe("none");
        const video = container.querySelector(
          'section[aria-label="Video introduction"]',
        ) as HTMLElement;
        const videoBox = video.getBoundingClientRect();
        if (width >= 768) {
          const range = document.createRange();
          range.selectNodeContents(heading);
          const lines = [...range.getClientRects()];
          expect(lines).toHaveLength(2);
          for (const line of lines) {
            expect(Math.abs(line.width - videoBox.width)).toBeLessThan(1);
          }
        }
        expect(getComputedStyle(video).backgroundColor).toBe("rgb(0, 0, 0)");
        expect(getComputedStyle(video).color).toBe("rgb(255, 255, 255)");
        expect(
          Math.abs(videoBox.width / videoBox.height - 16 / 9),
        ).toBeLessThan(0.01);
        expect(heading.getBoundingClientRect().bottom).toBeLessThan(
          videoBox.top,
        );
        expect(videoBox.bottom).toBeLessThan(proof.getBoundingClientRect().top);

        const buttons =
          container.querySelectorAll<HTMLAnchorElement>("[data-site-cta]");
        expect(buttons).toHaveLength(1);
        for (const button of buttons) {
          expect(button.getAttribute("data-variant")).toBe("filled");
          const label = button.querySelector(
            ".mantine-Button-label",
          ) as HTMLElement;
          expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
          const buttonHeight = button.getBoundingClientRect().height;
          expect(buttonHeight).toBeGreaterThanOrEqual(32);
        }
        const email = container.querySelector(
          'a[href="mailto:aj@quantile.co"]',
        ) as HTMLElement;
        const signature = email.parentElement as HTMLElement;
        const letterButton = buttons[0].getBoundingClientRect();
        const signatureBox = signature.getBoundingClientRect();
        expect(
          Math.abs(letterButton.height - signatureBox.height),
        ).toBeLessThan(1);
        expect(Math.abs(letterButton.top - signatureBox.top)).toBeLessThan(1);
        expect(signatureBox.right).toBeLessThan(letterButton.left);
        expect(parseFloat(getComputedStyle(email).fontSize)).toBeLessThan(
          parseFloat(getComputedStyle(signature).fontSize),
        );
        const article = container.querySelector(
          'article[aria-labelledby="founder-letter-title"]',
        ) as HTMLElement;
        const articleBox = article.getBoundingClientRect();
        if (width <= 768) {
          expect(Math.abs(articleBox.left - 33)).toBeLessThan(1);
          expect(
            Math.abs(
              document.documentElement.clientWidth - articleBox.right - 33,
            ),
          ).toBeLessThan(1);
        } else {
          expect(
            Math.abs(articleBox.width - Math.min(976, (width * 695) / 1024)),
          ).toBeLessThan(1);
        }
        expect(getComputedStyle(signature).fontSize).toBe(
          getComputedStyle(article).fontSize,
        );
        if (width >= 1440)
          expect(getComputedStyle(article).fontSize).toBe("32px");
        expect(letterButton.width / letterButton.height).toBeGreaterThan(2);
        const articleRight =
          articleBox.right - parseFloat(getComputedStyle(article).paddingRight);
        expect(Math.abs(letterButton.right - articleRight)).toBeLessThan(1);
      }
    });
  }

  it("supports booking and signature email", async () => {
    await page.viewport(390, 844);
    await renderPage("light");
    const cta = container.querySelector("[data-site-cta]") as HTMLAnchorElement;
    expect(cta.href).toBe("https://cal.com/aj-welch/book-a-call");
    expect(cta.target).toBe("_blank");
    expect(cta.relList.contains("noopener")).toBe(true);
    expect(cta.relList.contains("noreferrer")).toBe(true);
    const email = container.querySelector(
      'a[href="mailto:aj@quantile.co"]',
    ) as HTMLAnchorElement;
    expect(getComputedStyle(email).textDecorationLine).toBe("underline");
    email.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(
      container.querySelector("article [data-site-cta]"),
    );
  });
});
