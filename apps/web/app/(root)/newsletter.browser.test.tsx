import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { Container, MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { theme } from "@/app/theme";
import { NewsletterArticleListItem } from "@/components/NewsletterArticleListItem/NewsletterArticleListItem";
import { NewsletterHero } from "@/components/NewsletterHero/NewsletterHero";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm/NewsletterSubscribeForm";
import listingClasses from "./newsletter.module.css";

// Next Link reads build-time environment flags outside the Next bundler.
vi.hoisted(() => vi.stubGlobal("process", { env: {} }));
afterAll(() => vi.unstubAllGlobals());

let container: HTMLDivElement;
let root: Root;
let initialViewport: { width: number; height: number };

afterEach(async () => {
  root?.unmount();
  container?.remove();
  if (initialViewport) {
    await page.viewport(initialViewport.width, initialViewport.height);
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  it(`reverses the consulting preview in both listing layouts in ${colorScheme} mode`, async () => {
    initialViewport = { width: window.innerWidth, height: window.innerHeight };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        <Container size="sm">
          {(["grid", "list"] as const).map((variant) => (
            <NewsletterArticleListItem
              key={variant}
              component="aside"
              variant={variant}
              label="Consulting"
              href="/consulting"
              title="Data and AI consulting"
              subtitle="Senior data and AI engineering, working alongside your team."
              image={
                <div className={listingClasses.consultingImage}>
                  <span
                    className={listingClasses.wordmark}
                    role="img"
                    aria-label="Quantile"
                  />
                </div>
              }
            />
          ))}
        </Container>
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelectorAll('[role="img"]')).toHaveLength(2),
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.viewport(width, 900);
      for (const wordmark of container.querySelectorAll('[role="img"]')) {
        const tile = wordmark.parentElement as HTMLElement;
        expect(getComputedStyle(tile).backgroundColor).toBe(
          colorScheme === "light" ? "rgb(9, 9, 11)" : "rgb(250, 250, 250)",
        );
        expect(getComputedStyle(wordmark).backgroundColor).toBe(
          colorScheme === "light" ? "rgb(250, 250, 250)" : "rgb(9, 9, 11)",
        );
        expect(getComputedStyle(wordmark).maskImage).toContain(
          "wordmark-dark.svg",
        );
        expect(wordmark.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(wordmark.getBoundingClientRect().height).toBeGreaterThan(0);
      }
    }
  });

  it(`centers the shared homepage/archive signup under its title in ${colorScheme} mode`, async () => {
    initialViewport = { width: window.innerWidth, height: window.innerHeight };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        <Container size="xl" px="var(--site-page-padding)">
          <NewsletterHero>
            <NewsletterSubscribeForm
              layout="compact"
              buttonProps={{ children: "Subscribe" }}
            />
          </NewsletterHero>
        </Container>
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("input")).not.toBeNull(),
    );
    await document.fonts.ready;

    for (const width of [320, 375, 390, 480, 575, 576, 577, 768, 1024, 1440]) {
      await page.viewport(width, 900);
      const title = container.querySelector("h1") as HTMLElement;
      const input = container.querySelector("input") as HTMLElement;
      const titleBox = title.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      expect(
        Math.abs(
          inputBox.left +
            inputBox.width / 2 -
            titleBox.left -
            titleBox.width / 2,
        ),
      ).toBeLessThan(1);
      expect(inputBox.width).toBeGreaterThan(0);
      expect(inputBox.top).toBeGreaterThan(titleBox.bottom);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
  });
}
