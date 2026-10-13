import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Browser tests need the site's typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Match the site's actual typography in responsive browser checks.
import { theme } from "@/app/theme";
import { BenefitsAnimationTwo } from "./BenefitsAnimationTwo";

let container: HTMLDivElement;
let root: Root | undefined;
let samplingFrame: number | undefined;
const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function motionPreference(reduced: boolean) {
  const preference = new EventTarget();
  const query = Object.assign(preference, {
    matches: reduced,
    media: "(prefers-reduced-motion: reduce)",
  });
  const nativeMatchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((media) =>
    media === query.media ? (query as MediaQueryList) : nativeMatchMedia(media),
  );
  return (matches: boolean) => {
    query.matches = matches;
    query.dispatchEvent(new Event("change"));
  };
}

async function mount(colorScheme: "light" | "dark" = "light") {
  container = document.createElement("div");
  container.style.padding = "20px";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <BenefitsAnimationTwo />
    </MantineProvider>,
  );
  await vi.waitFor(() =>
    expect(container.querySelector("[data-current]")).not.toBeNull(),
  );
  await document.fonts.ready;
  await frame();
}

function current() {
  const element = container.querySelector<HTMLElement>("[data-current]");
  if (!element) throw new Error("Missing current activity");
  return element;
}

afterEach(async () => {
  if (samplingFrame !== undefined) cancelAnimationFrame(samplingFrame);
  samplingFrame = undefined;
  root?.unmount();
  root = undefined;
  container?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("BenefitsAnimationTwo", () => {
  it("provides a static reduced-motion view that fits narrow and wide screens", async () => {
    motionPreference(true);
    await mount();
    expect(current().dataset.activity).toBe("2");
    expect(container.querySelector("button")).toBeNull();

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.viewport(width, 900);
      await frame();
      await frame();
      const viewport = container.querySelector<HTMLElement>(
        "[data-thread-viewport]",
      );
      if (!viewport) throw new Error("Missing viewport");
      const scene = container.querySelector<HTMLElement>(
        '[data-benefits-animation="two"]',
      );
      expect(
        scene?.getBoundingClientRect().height,
        `compact height at ${width}px`,
      ).toBeLessThanOrEqual(290);
      const bounds = viewport.getBoundingClientRect();
      const entry = current().getBoundingClientRect();
      expect(
        container.scrollWidth,
        `overflow at ${width}px`,
      ).toBeLessThanOrEqual(container.clientWidth);
      expect(entry.top, `entry top at ${width}px`).toBeGreaterThanOrEqual(
        bounds.top,
      );
      expect(entry.bottom, `entry bottom at ${width}px`).toBeLessThanOrEqual(
        bounds.bottom,
      );
      expect(current().scrollWidth).toBeLessThanOrEqual(current().clientWidth);
    }
    expect(current().dataset.activity).toBe("2");
  });

  it.each([
    "light",
    "dark",
  ] as const)("keeps all eight cards single-line and contained across responsive widths in %s mode", async (colorScheme) => {
    motionPreference(true);
    await mount(colorScheme);
    for (const width of [
      320, 360, 375, 390, 425, 426, 480, 600, 767, 768, 820, 1023, 1024, 1200,
      1440, 1920, 2560,
    ]) {
      await page.viewport(width, 900);
      await frame();
      const scene = container.querySelector<HTMLElement>(
        '[data-benefits-animation="two"]',
      );
      if (!scene) throw new Error("Missing animation");
      const cards = Array.from(
        scene.querySelectorAll<HTMLElement>("[data-activity]"),
      );
      expect(cards).toHaveLength(8);
      const artifacts = Array.from(
        scene.querySelectorAll<HTMLElement>("[data-artifact-kind]"),
      );
      expect(artifacts).toHaveLength(7);
      for (const artifact of artifacts) {
        expect(
          getComputedStyle(artifact).display,
          `desktop-only detail at ${width}px`,
        ).toBe(width >= 1024 ? "grid" : "none");
      }
      if (width >= 1024) {
        for (const card of cards) {
          const artifact = card.querySelector<HTMLElement>(
            "[data-artifact-kind]",
          );
          if (!artifact) continue;
          const lastText = Math.max(
            ...Array.from(card.querySelectorAll("dd"), (text) => {
              const box = text.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(text);
              return Math.min(box.right, range.getBoundingClientRect().right);
            }),
          );
          const cardRight = card.getBoundingClientRect().right;
          const detailBounds = artifact.getBoundingClientRect();
          expect(
            detailBounds.left - lastText,
            `clear of copy at ${width}px (${artifact.dataset.artifactKind})`,
          ).toBeGreaterThanOrEqual(7);
          expect(
            detailBounds.right,
            `right-aligned detail at ${width}px`,
          ).toBeCloseTo(
            cardRight -
              Number.parseFloat(getComputedStyle(card).paddingRight) -
              1,
            0,
          );
          expect(getComputedStyle(artifact).textAlign).toBe("center");
        }
      }
      const avatarSize = cards[0]
        .querySelector<HTMLElement>('[class*="avatar"]')
        ?.getBoundingClientRect();
      const mergeSize = cards[7]
        .querySelector<HTMLElement>('[class*="mergeStamp"]')
        ?.getBoundingClientRect();
      expect(mergeSize?.width, `merge/avatar width at ${width}px`).toBe(
        avatarSize?.width,
      );
      expect(mergeSize?.height, `merge/avatar height at ${width}px`).toBe(
        avatarSize?.height,
      );
      const mergedHeading = cards[7].querySelector<HTMLElement>(
        '[class*="mergeHeading"]',
      );
      const authorHeading = cards[0].querySelector<HTMLElement>(
        '[class*="messageMeta"]',
      );
      const pr = mergedHeading?.querySelector("strong");
      const outcome = mergedHeading?.querySelector<HTMLElement>(
        '[class*="mergeOutcome"]',
      );
      const author = authorHeading?.querySelector("strong");
      if (!mergedHeading || !authorHeading || !pr || !outcome || !author)
        throw new Error("Missing card header");
      expect(
        mergedHeading.getBoundingClientRect().height,
        `merged header at ${width}px`,
      ).toBe(authorHeading.getBoundingClientRect().height);
      expect(pr.textContent).toBe("PR #1979");
      expect(outcome.textContent).toBe("Merged");
      const prRect = pr.getBoundingClientRect();
      const outcomeRect = outcome.getBoundingClientRect();
      expect(
        Math.abs(
          (prRect.top + prRect.bottom - outcomeRect.top - outcomeRect.bottom) /
            2,
        ),
        `single-line merge at ${width}px`,
      ).toBeLessThan(2);
      expect(getComputedStyle(pr).fontSize).toBe(
        getComputedStyle(author).fontSize,
      );
      for (const card of cards) {
        const bounds = card.getBoundingClientRect();
        expect(
          bounds.width,
          `card ${card.dataset.activity} at ${width}px`,
        ).toBeCloseTo(cards[0].getBoundingClientRect().width, 1);
        expect(bounds.height, `card height at ${width}px`).toBe(
          width >= 768 && width < 1024
            ? 152
            : width >= 1024 && width < 1200
              ? 160
              : 168,
        );
        expect(
          card.scrollWidth,
          `card overflow at ${width}px`,
        ).toBeLessThanOrEqual(card.clientWidth);
        const meta = card.querySelector<HTMLElement>('[class*="messageMeta"]');
        if (meta) {
          expect(
            meta.getBoundingClientRect().height,
            `metadata at ${width}px`,
          ).toBe(width >= 768 && width < 1024 ? 22 : 24);
          const author = meta.querySelector("strong");
          const mainRow = card.querySelector<HTMLElement>("dd");
          if (author && mainRow) {
            expect(
              getComputedStyle(mainRow).fontSize,
              `main row matches author at ${width}px`,
            ).toBe(getComputedStyle(author).fontSize);
          }
        }
      }
      for (const text of scene.querySelectorAll<HTMLElement>(
        '[class*="issueCopy"] > *, [class*="messageMeta"] strong, [class*="label"], [class*="day"], dt, dd, [class*="detailText"], [class*="participantName"], [class*="mergeOutcome"], [class*="mergeHeading"] strong',
      )) {
        const style = getComputedStyle(text);
        expect(style.whiteSpace, `${text.textContent} at ${width}px`).toBe(
          "nowrap",
        );
        expect(
          text.getBoundingClientRect().height,
          `single line: ${text.textContent} at ${width}px`,
        ).toBeLessThanOrEqual(Number.parseFloat(style.lineHeight) + 1);
        if (!text.className.includes("day"))
          expect(style.textOverflow).toBe("ellipsis");
      }
      expect(
        container.scrollWidth,
        `page overflow at ${width}px`,
      ).toBeLessThanOrEqual(container.clientWidth);
    }
  });

  it("progresses through review, optional call, approval and merge, then loops", async () => {
    const setReducedMotion = motionPreference(true);
    await mount();
    // Start playback only after installing fake dwell timers.
    await frame();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setReducedMotion(false);
    await frame();
    await frame();

    const cardWidth = current().getBoundingClientRect().width;
    const statusWidth = container
      .querySelector('[class*="prStatus"]')
      ?.getBoundingClientRect().width;
    const backwardsJumps: string[] = [];
    let previous: { index: string | undefined; y: number } | undefined;
    const sampleMovement = () => {
      const card = current();
      const index = card.dataset.activity;
      const y = new DOMMatrixReadOnly(getComputedStyle(card).transform).m42;
      if (previous && previous.index === index && y > previous.y + 1) {
        backwardsJumps.push(`${index}: ${previous.y} → ${y}`);
      }
      previous = { index, y };
      samplingFrame = requestAnimationFrame(sampleMovement);
    };
    sampleMovement();
    for (const [index, duration] of [
      3600, 3000, 3600, 3200, 3200, 3600, 2600, 3200,
    ].entries()) {
      await vi.advanceTimersByTimeAsync(duration);
      await frame();
      await frame();
      expect(current().dataset.activity).toBe(String((index + 1) % 8));
      expect(current().getBoundingClientRect().width).toBeCloseTo(cardWidth, 1);
      expect(
        container.querySelector('[class*="prStatus"]')?.getBoundingClientRect()
          .width,
      ).toBe(statusWidth);
      expect(current().querySelector('[class*="day"]')?.textContent).toMatch(
        /^Day [123]$/,
      );
      if (index === 2)
        expect(current().textContent).toContain("30 min · Optional");
      if (index === 3) {
        expect(current().querySelector("[data-call-room]")).not.toBeNull();
        expect(current().querySelectorAll("[data-speaking-bar]")).toHaveLength(
          3,
        );
        expect(current().textContent).toContain("AJ WelchYour team");
      }
      if (index === 5)
        expect(current().textContent).toContain("Your teamApproved");
      const nextIndex = (index + 1) % 8;
      expect(container.querySelector('[class*="prStatus"]')?.textContent).toBe(
        nextIndex === 7
          ? "Merged"
          : nextIndex === 6
            ? "Approved"
            : "In progress",
      );
      expect(current().querySelector('[class*="day"]')?.textContent).toBe(
        [
          "Day 1",
          "Day 1",
          "Day 2",
          "Day 2",
          "Day 2",
          "Day 3",
          "Day 3",
          "Day 3",
        ][nextIndex],
      );
      if (index === 6) expect(current().textContent).toContain("Merged");
    }
    if (samplingFrame !== undefined) cancelAnimationFrame(samplingFrame);
    samplingFrame = undefined;
    expect(backwardsJumps).toEqual([]);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await frame();
    await vi.advanceTimersByTimeAsync(20000);
    await frame();
    expect(current().dataset.activity).toBe("0");
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await frame();
    await frame();
    expect(
      new DOMMatrixReadOnly(getComputedStyle(current()).transform).m42,
    ).toBe(8);
  });

  it("responds to motion preference changes and stops timers on unmount", async () => {
    const setReducedMotion = motionPreference(false);
    await mount();
    await vi.waitFor(() => expect(current().dataset.activity).toBe("0"));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setReducedMotion(true);
    await frame();
    await vi.advanceTimersByTimeAsync(20000);
    expect(current().dataset.activity).toBe("2");
    expect(container.querySelector("button")).toBeNull();
    setReducedMotion(false);
    await frame();
    expect(current().dataset.activity).toBe("0");
    root?.unmount();
    root = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
});
