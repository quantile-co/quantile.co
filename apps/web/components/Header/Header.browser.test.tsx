import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: This browser fixture needs the site's actual global layout styles.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Exercise the header under the site's actual theme.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Verify the real app-composed CTA fits beside the header wordmark.
import { CTAButton } from "@/components/CTAButton/CTAButton";
import { Header } from "./Header";

// Next Link reads build-time environment flags outside the Next bundler.
vi.hoisted(() => vi.stubGlobal("process", { env: {} }));
afterAll(() => vi.unstubAllGlobals());

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
        <Header action={<CTAButton />} />
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

    for (const width of [320, 375, 576, 768, 1440]) {
      await page.viewport(width, 900);
      main.style.height = "100px";
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(
        window.innerHeight,
      );
      const wordmark = container.querySelector(
        'header [role="img"]',
      ) as HTMLElement;
      const cta = container.querySelector(
        'header [data-site-cta="booking"]',
      ) as HTMLElement;
      const wordmarkBox = wordmark.getBoundingClientRect();
      const ctaBox = cta.getBoundingClientRect();
      expect(wordmarkBox.height).toBe(35);
      expect(ctaBox.height).toBe(32);
      expect(ctaBox.height).toBeLessThanOrEqual(wordmarkBox.height);
      expect(ctaBox.top).toBeGreaterThanOrEqual(wordmarkBox.top);
      expect(ctaBox.bottom).toBeLessThanOrEqual(wordmarkBox.bottom);
      expect(ctaBox.left).toBeGreaterThan(wordmarkBox.right);
      expect(cta.textContent).toBe("Book a call");
      expect(cta.querySelector("svg")).toBeNull();
      expect(cta.getAttribute("href")).toBe(
        "https://cal.com/aj-welch/book-a-call",
      );
      const before = measureHeader();
      expect(before).toHaveLength(4);

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
