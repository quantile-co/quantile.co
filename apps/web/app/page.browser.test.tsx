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
    it(`keeps content unclipped and support rows side by side in ${colorScheme} mode`, async () => {
      await renderPage(colorScheme);
      for (const width of [320, 768, 1440]) {
        await page.viewport(width, 900);
        const heading = container.querySelector("h1") as HTMLElement;
        const proof = container.querySelector(
          'section[aria-label^="AJ Welch"]',
        ) as HTMLElement;
        await vi.waitFor(() =>
          expect(
            proof.querySelectorAll("article:not([aria-hidden])"),
          ).toHaveLength(width < 768 ? 1 : 4),
        );
        const heroButton = container.querySelector(
          "main [data-site-cta]",
        ) as HTMLElement;
        const footerButton = container.querySelector(
          "footer [data-site-cta]",
        ) as HTMLElement;
        const profile = container.querySelector(
          "footer [data-profile]",
        ) as HTMLElement;

        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
        expect(profile.getBoundingClientRect().right).toBeLessThanOrEqual(
          (footerButton.parentElement as HTMLElement).getBoundingClientRect()
            .left,
        );
        if (width < 768) {
          expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(
            proof.getBoundingClientRect().top,
          );
          expect(proof.getBoundingClientRect().right).toBeLessThanOrEqual(
            (heroButton.parentElement as HTMLElement).getBoundingClientRect()
              .left,
          );
        }
        for (const button of [heroButton, footerButton]) {
          expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
          expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(
            44,
          );
        }
      }
    });
  }

  it("supports booking, email, skip-link navigation and theme selection", async () => {
    await page.viewport(390, 844);
    await renderPage("light");
    const cta = container.querySelector(
      'a[data-site-cta="letter"]',
    ) as HTMLAnchorElement;
    expect(cta.href).toBe("https://cal.com/aj-welch/book-a-call");
    expect(cta.target).toBe("_blank");
    expect(cta.relList.contains("noopener")).toBe(true);
    expect(cta.relList.contains("noreferrer")).toBe(true);
    const email = container.querySelector(
      'a[href="mailto:aj@quantile.co"]',
    ) as HTMLAnchorElement;
    expect(getComputedStyle(email).textDecorationLine).toBe("underline");
    cta.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(email);

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
        getComputedStyle(darkLabel.closest("fieldset") as HTMLElement)
          .pointerEvents,
      ).toBe("auto"),
    );
    await userEvent.click(darkLabel);
    await vi.waitFor(() => {
      expect(document.documentElement.dataset.mantineColorScheme).toBe("dark");
      expect(dark.checked).toBe(true);
    });
  });
});
