import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { Container, MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { theme } from "@/app/theme";
import headerClasses from "@/components/Header/Header.module.css";

let container: HTMLDivElement;
let root: Root;
const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};

afterEach(async () => {
  root?.unmount();
  container?.remove();
  await page.viewport(initialViewport.width, initialViewport.height);
});

for (const colorScheme of ["light", "dark"] as const) {
  it(`keeps header content stationary when page overflow changes in ${colorScheme} mode`, async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    root.render(
      <MantineProvider forceColorScheme={colorScheme} theme={theme}>
        <header className={headerClasses.header}>
          <Container
            size="xl"
            px="var(--site-page-padding)"
            className={headerClasses.inner}
          >
            <a href="/" className={headerClasses.homeLink}>
              <span className={headerClasses.wordmark} />
            </a>
            <nav>
              <a href="/newsletter" className={headerClasses.link}>
                Newsletter
              </a>
              <a href="/consulting" className={headerClasses.link}>
                Consulting
              </a>
            </nav>
          </Container>
        </header>
        <main style={{ height: 100 }} />
      </MantineProvider>,
    );
    await vi.waitFor(() =>
      expect(container.querySelector("main")).not.toBeNull(),
    );
    await document.fonts.ready;
    expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe(
      "stable",
    );

    const main = container.querySelector("main") as HTMLElement;
    const measureHeader = () =>
      [...container.querySelectorAll("header a")].flatMap((link) => {
        const range = document.createRange();
        range.selectNodeContents(link);
        const box = link.textContent
          ? range.getBoundingClientRect()
          : link.getBoundingClientRect();
        return [box.left, box.right];
      });

    for (const width of [375, 576, 768, 1440]) {
      await page.viewport(width, 900);
      main.style.height = "100px";
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(
        window.innerHeight,
      );
      const before = measureHeader();
      expect(before).toHaveLength(6);

      for (const height of [1800, 100]) {
        main.style.height = `${height}px`;
        expect(document.documentElement.scrollHeight > window.innerHeight).toBe(
          height === 1800,
        );
        const after = measureHeader();
        after.forEach((edge, index) => {
          expect(Math.abs(edge - before[index])).toBeLessThan(0.1);
        });
      }
    }
  });
}
