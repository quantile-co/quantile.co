import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Exercise the real site tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { type ReactNode, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Use the actual site typography.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Verify the visual injected by the composition root.
import { BenefitsSection } from "../BenefitsSection/BenefitsSection";
import { BenefitsAnimation1 } from "./BenefitsAnimation1";
import { BenefitsAnimation3 } from "./BenefitsAnimation3";

let container: HTMLDivElement;
let root: Root | undefined;
let preference: MediaQueryList;
const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
function element(selector: string, parent: ParentNode = container) {
  const found = parent.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const scene = () => element('[data-benefits-animation="three"]');
const opacity = (selector: string) =>
  Number(getComputedStyle(element(selector, scene())).opacity);
function reduceMotion(matches: boolean) {
  Object.defineProperty(preference, "matches", {
    value: matches,
    configurable: true,
  });
  preference.dispatchEvent(new Event("change"));
}
async function seek(seconds: number) {
  for (const animation of scene().getAnimations({ subtree: true })) {
    animation.pause();
    animation.currentTime = seconds * 1000;
  }
  await nextFrame();
}
function CheckoutForm({ children }: { children: ReactNode }) {
  return <form action="/checkout-preview">{children}</form>;
}
async function mount(section = false, colorScheme: "light" | "dark" = "light") {
  root?.render(
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        {section ? (
          <BenefitsSection
            CheckoutForm={CheckoutForm}
            onboardingVisual={<BenefitsAnimation1 />}
            capacityVisual={<BenefitsAnimation3 />}
          />
        ) : (
          <div style={{ padding: 20 }}>
            <BenefitsAnimation3 />
          </div>
        )}
      </MantineProvider>
    </StrictMode>,
  );
  await vi.waitFor(() =>
    expect(
      container.querySelector('[data-benefits-animation="three"]'),
    ).not.toBeNull(),
  );
  await document.fonts.ready;
  await nextFrame();
  await nextFrame();
}
beforeEach(() => {
  preference = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
  }) as MediaQueryList;
  const nativeMatchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === preference.media ? preference : nativeMatchMedia(query),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  root?.unmount();
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
  window.scrollTo(0, 0);
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("BenefitsAnimation3", () => {
  it.each([
    320, 768, 1440,
  ])("traces level rates, capacity steps and a preserved remainder at %ipx", async (width) => {
    await page.viewport(width, 1000);
    await mount();
    reduceMotion(false);
    const chart = element("[data-rate-chart]").getBoundingClientRect();
    const point = () => {
      const bounds = element("[data-rate-point]").getBoundingClientRect();
      return {
        x: ((bounds.left - chart.left) / chart.width) * 480,
        y: ((bounds.top - chart.top) / chart.height) * 184,
      };
    };
    const reveal = () =>
      Number.parseFloat(
        getComputedStyle(element("[data-rate-reveal]")).strokeDashoffset,
      );
    const line = element("[data-rate-line]") as unknown as SVGPathElement;
    expect(line.getTotalLength()).toBe(490);
    expect(
      scene().getAnimations({ subtree: true })[0].effect?.getTiming().duration,
    ).toBe(8500);
    expect(getComputedStyle(line).vectorEffect).toBe("non-scaling-stroke");
    expect(getComputedStyle(element("[data-rate-reveal]")).vectorEffect).toBe(
      "none",
    );
    // Every event gets exactly 1.4 seconds, independent of path length.
    // Every text box starts 0.2 seconds after its point, then remains visible.
    const events = [
      { id: "start", selector: "[data-start-note]", x: 0, y: 92 },
      { id: "upgrade", selector: "[data-increase]", x: 120, y: 24 },
      { id: "downgrade", selector: "[data-decrease]", x: 160, y: 58 },
      { id: "renewal", selector: "[data-renewal-note]", x: 320, y: 58 },
      { id: "pause", selector: "[data-pause-note]", x: 388, y: 58 },
    ];
    for (const time of [0.4, 1, 1.4, 1.8, 2.4, 2.8, 3.5, 4.2, 4.9, 5.6]) {
      await seek(time);
      const tip = line.getPointAtLength(490 - reveal());
      expect(point().x, `x at ${time}s`).toBeCloseTo(tip.x, 0);
      expect(point().y, `y at ${time}s`).toBeCloseTo(tip.y, 0);
    }
    for (const [index, event] of events.entries()) {
      const at = index * 1.4;
      await seek(at);
      expect(point().x).toBeCloseTo(event.x, 1);
      expect(point().y).toBeCloseTo(event.y, 1);
      await seek(at + 0.19);
      expect(opacity(event.selector)).toBe(0);
      expect(opacity(`[data-tail="${event.id}"]`)).toBe(0);
      const marker =
        event.id === "pause"
          ? "[data-pause-mark]"
          : `[data-milestone="${event.id}"]`;
      expect(opacity(marker)).toBe(1);
      expect(opacity("[data-banked]")).toBe(event.id === "pause" ? 1 : 0);
      await seek(at + 0.36);
      expect(opacity(event.selector)).toBe(1);
      expect(opacity(`[data-tail="${event.id}"]`)).toBe(1);
    }
    expect(element('[data-callout="upgrade"]').textContent).toContain(
      "+$2,497.50 prorated",
    );
    expect(element('[data-callout="downgrade"]').textContent).toContain(
      "$9,990 billed",
    );
    expect(element('[data-callout="renewal"] strong').textContent).toBe(
      "2 concurrent issues",
    );
    await seek(8.49);
    expect(point().x).toBeCloseTo(388, 1);
    expect(reveal()).toBe(0);
    expect(opacity("[data-capacity-art]")).toBe(1);
    for (const event of events) expect(opacity(event.selector)).toBe(1);
    expect(opacity("[data-banked]")).toBe(1);
    await seek(8.51);
    expect(opacity("[data-banked]")).toBe(0);
    expect(opacity("[data-capacity-art]")).toBe(1);
    for (const event of events) expect(opacity(event.selector)).toBe(0);
    expect(point().x).toBeLessThan(1);
  });

  it.each([
    "light",
    "dark",
  ] as const)("matches onboarding geometry and responsive layout in %s mode", async (scheme) => {
    await mount(true, scheme);
    const art = element("[data-capacity-art]");
    const artStyle = getComputedStyle(art);
    expect(artStyle.padding).toBe("0px");
    expect(artStyle.borderTopWidth).toBe("0px");
    expect(artStyle.boxShadow).toBe("none");
    expect(
      getComputedStyle(element('[data-callout="start"]')).boxShadow,
    ).not.toBe("none");
    const other = element("[data-onboarding-area]");
    const intro = scene().closest<HTMLElement>("[data-has-visual]");
    if (!intro?.firstElementChild)
      throw new Error("Missing section introduction");
    const copy = intro.firstElementChild;
    expect(scene().closest("section")?.getAttribute("aria-labelledby")).toBe(
      "benefits-capacity",
    );
    expect(scene().querySelector("button, input, form, a")).toBeNull();
    expect(scene().getAnimations({ subtree: true })).toHaveLength(0);
    expect(opacity("[data-banked]")).toBe(1);
    for (const width of [
      320, 360, 375, 390, 425, 426, 480, 600, 767, 768, 820, 960, 1023, 1024,
      1200, 1440, 1920, 2560,
    ]) {
      await page.viewport(width, 1000);
      await nextFrame();
      await nextFrame();
      await nextFrame();
      const bounds = art.getBoundingClientRect();
      const reference = other.getBoundingClientRect();
      expect(bounds.width).toBeCloseTo(reference.width, 1);
      expect(bounds.height).toBe(
        reference.height +
          (width >= 768 && width < 1024
            ? 12
            : width >= 1024 && width < 1200
              ? 8
              : 32),
      );
      expect(bounds.left).toBeCloseTo(reference.left, 1);
      const textRects = Array.from(copy.children).flatMap((child) => {
        const range = document.createRange();
        range.selectNodeContents(child);
        return Array.from(range.getClientRects());
      });
      if (width >= 768) {
        const textRight = Math.max(...textRects.map((rect) => rect.right));
        expect(bounds.left).toBeGreaterThan(textRight);
        expect(bounds.right).toBeLessThanOrEqual(
          intro.getBoundingClientRect().right,
        );
        const textCenter =
          (Math.min(...textRects.map((rect) => rect.top)) +
            Math.max(...textRects.map((rect) => rect.bottom))) /
          2;
        expect(
          Math.abs((bounds.top + bounds.bottom) / 2 - textCenter),
          `vertical center at ${width}`,
        ).toBeLessThan(16);
      } else {
        const subtitle = element("p", copy).getBoundingClientRect();
        const steps = element(
          "ol",
          intro.parentElement as HTMLElement,
        ).getBoundingClientRect();
        expect(bounds.left).toBeCloseTo(subtitle.left, 0);
        if (width <= 425) expect(bounds.right).toBeCloseTo(subtitle.right, 0);
        expect(
          Math.abs(bounds.top - subtitle.bottom - (steps.top - bounds.bottom)),
          `mobile gaps at ${width}`,
        ).toBeLessThan(4);
      }
      for (const selector of [
        '[data-axis-month="4"]',
        '[data-callout="start"]',
        '[data-axis-month="1"]',
        '[data-axis-month="2"]',
        '[data-axis-month="3"]',
        '[data-callout="upgrade"]',
        '[data-callout="downgrade"]',
        '[data-callout="pause"]',
        '[data-callout="renewal"]',
      ]) {
        const label = element(selector);
        expect(getComputedStyle(label).whiteSpace).toBe("nowrap");
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        const labelBounds = label.getBoundingClientRect();
        expect(labelBounds.left).toBeGreaterThanOrEqual(bounds.left);
        expect(labelBounds.right).toBeLessThanOrEqual(bounds.right + 1);
        expect(labelBounds.top).toBeGreaterThanOrEqual(bounds.top);
        expect(labelBounds.bottom).toBeLessThanOrEqual(bounds.bottom);
      }
      const plot = element("[data-rate-chart]").getBoundingClientRect();
      expect(plot.right).toBeCloseTo(reference.right, 1);
      const month = element('[data-axis-month="3"]').getBoundingClientRect();
      expect((month.left + month.right) / 2).toBeCloseTo(
        plot.left + (plot.width * 320) / 480,
        0,
      );
      expect(
        element('[data-callout="pause"]').getBoundingClientRect().width,
      ).toBeCloseTo(
        element('[data-callout="downgrade"]').getBoundingClientRect().width,
        1,
      );
      const callouts = [
        "[data-increase]",
        "[data-decrease]",
        "[data-pause-note]",
        "[data-start-note]",
        "[data-renewal-note]",
      ].map((selector) => element(selector).getBoundingClientRect());
      for (const [index, callout] of callouts.entries()) {
        expect(callout.left).toBeGreaterThanOrEqual(bounds.left);
        expect(callout.right).toBeLessThanOrEqual(bounds.right);
        for (const other of callouts.slice(index + 1)) {
          expect(
            callout.right + 6 <= other.left ||
              other.right + 6 <= callout.left ||
              callout.bottom + 6 <= other.top ||
              other.bottom + 6 <= callout.top,
            `callout overlap at ${width}px`,
          ).toBe(true);
        }
      }
      expect(scene().querySelector("[data-period-boundary]")).toBeNull();
      expect(
        scene().querySelector(
          "[data-axis-issues], [data-axis-price], [data-axis-extension], [data-axis-title]",
        ),
      ).toBeNull();
      for (const month of [1, 2, 3, 4]) {
        const tick = element(`[data-axis-month="${month}"]`);
        expect(tick.textContent).toBe(`Month ${month}`);
        const padding = month === 4 ? "0px" : "8px";
        expect(getComputedStyle(tick).paddingInlineStart).toBe(padding);
        expect(getComputedStyle(tick).paddingInlineEnd).toBe(padding);
        const rect = tick.getBoundingClientRect();
        expect(
          rect.left,
          `month ${month} left inset at ${width}px`,
        ).toBeGreaterThanOrEqual(bounds.left);
        expect(
          rect.right,
          `month ${month} right inset at ${width}px`,
        ).toBeLessThanOrEqual(bounds.right);
        if (month === 4) {
          expect(rect.right).toBeCloseTo(plot.right, 1);
        } else {
          expect((rect.left + rect.right) / 2).toBeCloseTo(
            plot.left + (plot.width * (month - 1)) / 3,
            1,
          );
        }
        expect((rect.top + rect.bottom) / 2).toBeCloseTo(
          plot.top + (plot.height * 180) / 184,
          1,
        );
      }
      // No billing note may cover any part of the stepped line.
      const line = element("[data-rate-line]") as unknown as SVGPathElement;
      expect(getComputedStyle(line).strokeWidth).toBe("1.5px");
      expect(getComputedStyle(line).opacity).toBe("1");
      const savedSegment = element("[data-banked] > svg");
      const savedStyle = getComputedStyle(savedSegment);
      expect(savedStyle.height).toBe("2px");
      expect(savedStyle.stroke).toBe(getComputedStyle(line).stroke);
      expect(savedStyle.strokeWidth).toBe(getComputedStyle(line).strokeWidth);
      expect(savedStyle.strokeDasharray).toBe("0px, 4px");
      expect(savedStyle.strokeLinecap).toBe("round");
      expect(element("[data-banked] path").getAttribute("vector-effect")).toBe(
        "non-scaling-stroke",
      );
      expect(savedStyle.opacity).toBe(getComputedStyle(line).opacity);
      const segmentBounds = savedSegment.getBoundingClientRect();
      const lastMonth = element(
        '[data-axis-month="4"]',
      ).getBoundingClientRect();
      const periodEndX = (lastMonth.left + lastMonth.right) / 2;
      expect(segmentBounds.right).toBeCloseTo(periodEndX, 1);
      expect((segmentBounds.top + segmentBounds.bottom) / 2).toBeCloseTo(
        plot.top + (58 / 184) * plot.height,
        1,
      );
      const sceneWidth = scene().getBoundingClientRect().width;
      const pointSize = Math.max(4, Math.min(6, sceneWidth * 0.0121));
      const endpoint = element("[data-period-end-point]");
      const endpointBounds = endpoint.getBoundingClientRect();
      const endpointStyle = getComputedStyle(endpoint);
      expect(endpoint.parentElement).toBe(element("[data-banked]"));
      expect(endpointBounds.width).toBeCloseTo(pointSize, 1);
      expect((endpointBounds.left + endpointBounds.right) / 2).toBeCloseTo(
        periodEndX,
        1,
      );
      expect((endpointBounds.top + endpointBounds.bottom) / 2).toBeCloseTo(
        plot.top + (58 / 184) * plot.height,
        1,
      );
      expect(endpointStyle.borderTopWidth).toBe("1px");
      expect(endpointStyle.borderTopColor).toBe(getComputedStyle(line).stroke);
      expect(endpointStyle.backgroundColor).toBe(
        getComputedStyle(art).backgroundColor,
      );
      for (const point of scene().querySelectorAll<HTMLElement>(
        "[data-milestone]",
      )) {
        expect(point.getBoundingClientRect().width).toBeCloseTo(pointSize, 1);
        expect(point.getBoundingClientRect().height).toBeCloseTo(pointSize, 1);
      }
      expect(
        element("[data-moving-dot]").getBoundingClientRect().width,
      ).toBeCloseTo(pointSize, 1);
      expect(getComputedStyle(element("[data-moving-dot]")).boxShadow).toBe(
        getComputedStyle(element('[data-milestone="start"]')).boxShadow,
      );
      expect(
        element("[data-pause-mark]").getBoundingClientRect().width,
      ).toBeCloseTo(Math.max(14, Math.min(18, sceneWidth * 0.0363)), 1);
      expect(getComputedStyle(line).stroke).toBe(
        getComputedStyle(element('[data-callout="start"] strong')).color,
      );
      for (const note of scene().querySelectorAll<HTMLElement>(
        "[data-callout]",
      )) {
        const rect = note.getBoundingClientRect();
        expect(rect.top).toBeGreaterThanOrEqual(bounds.top);
        expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom);
        for (
          let distance = 0;
          distance <= line.getTotalLength();
          distance += 1
        ) {
          const point = line.getPointAtLength(distance);
          const x = plot.left + (point.x / 480) * plot.width;
          const y = plot.top + (point.y / 184) * plot.height;
          expect(
            x < rect.left - 4 ||
              x > rect.right + 4 ||
              y < rect.top - 4 ||
              y > rect.bottom + 4,
            `line crosses ${note.dataset.callout} note at ${width}px`,
          ).toBe(true);
        }
      }
      for (const [id, x, y] of [
        ["start", 0, 92],
        ["upgrade", 120, 24],
        ["downgrade", 160, 58],
        ["renewal", 320, 58],
        ["pause", 388, 58],
      ] as const) {
        const pointer = element(`[data-tail="${id}"]`);
        expect(pointer.getAttribute("d")).toContain(`L ${x} ${y} L`);
        const box = element(`[data-callout="${id}"]`).getBoundingClientRect();
        const coordinates = pointer
          .getAttribute("d")
          ?.match(/-?\d+(?:\.\d+)?/g)
          ?.map(Number);
        if (!coordinates) throw new Error("Missing pointer geometry");
        const baseY = plot.top + (coordinates[1] / 184) * plot.height;
        const baseX =
          plot.left +
          ((coordinates[0] + coordinates[4]) / 2 / 480) * plot.width;
        const tipX = plot.left + (x / 480) * plot.width;
        const tipY = plot.top + (y / 184) * plot.height;
        expect(
          Math.hypot(baseX - tipX, baseY - tipY),
          `${id} pointer stretched at ${width}px`,
        ).toBeLessThan(18);
        const above = id === "upgrade" || id === "renewal";
        const gap = above ? tipY - box.bottom : box.top - tipY;
        expect(gap).toBeGreaterThanOrEqual(10);
        expect(gap).toBeLessThanOrEqual(14.1);
        expect(
          Math.min(Math.abs(baseY - box.top), Math.abs(baseY - box.bottom)),
        ).toBeCloseTo(1, 1);
      }
      const month1 = element('[data-axis-month="1"]').getBoundingClientRect();
      const month2 = element('[data-axis-month="2"]').getBoundingClientRect();
      const month1X = (month1.left + month1.right) / 2;
      const month2X = (month2.left + month2.right) / 2;
      const upgrade = element(
        '[data-milestone="upgrade"]',
      ).getBoundingClientRect();
      expect(
        ((upgrade.left + upgrade.right) / 2 - month1X) / (month2X - month1X),
      ).toBeCloseTo(0.75, 3);
      const start = element('[data-callout="start"]').getBoundingClientRect();
      const xAxisY = plot.top + (180 / 184) * plot.height;
      expect(
        xAxisY - start.bottom,
        `room below starting bill at ${width}px`,
      ).toBeGreaterThan(10);
      expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    }
  });

  it("pauses offscreen and in hidden tabs, restores reduced motion, and cleans up", async () => {
    await mount();
    expect(scene().getAnimations({ subtree: true })).toHaveLength(0);
    reduceMotion(false);
    await vi.waitFor(() =>
      expect(
        scene()
          .getAnimations({ subtree: true })
          .every((animation) => animation.playState === "running"),
      ).toBe(true),
    );
    await seek(4);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    const animation = scene().getAnimations({ subtree: true })[0];
    const held = animation.currentTime;
    await nextFrame();
    await nextFrame();
    expect(animation.playState).toBe("paused");
    expect(animation.currentTime).toBe(held);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await nextFrame();
    expect(animation.playState).toBe("running");
    container.style.marginTop = "200vh";
    await vi.waitFor(() => expect(animation.playState).toBe("paused"));
    container.style.marginTop = "0";
    await vi.waitFor(() => expect(animation.playState).toBe("running"));
    reduceMotion(true);
    expect(scene().getAnimations({ subtree: true })).toHaveLength(0);
    expect(opacity("[data-banked]")).toBe(1);
    expect(opacity("[data-pause-mark]")).toBe(1);
    expect(opacity("[data-increase]")).toBe(1);
    expect(opacity("[data-decrease]")).toBe(1);
    expect(opacity("[data-pause-note]")).toBe(1);
    expect(scene().querySelectorAll("[style]")).toHaveLength(1);
    expect(element("[data-rate-chart]").style.length).toBe(3);
    expect(
      element("[data-rate-chart]").style.getPropertyValue("--period-end-inset"),
    ).toMatch(/px$/);
    expect(
      element("[data-rate-chart]").style.getPropertyValue(
        "--billing-callout-width",
      ),
    ).toMatch(/px$/);
    reduceMotion(false);
    const animations = scene().getAnimations({ subtree: true });
    expect(animations.length).toBeGreaterThan(0);
    root?.unmount();
    root = undefined;
    expect(animations.every((item) => item.playState === "idle")).toBe(true);
    preference.dispatchEvent(new Event("change"));
    expect(container.childElementCount).toBe(0);
  });
});
