import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Browser tests need the site's typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Match the site's actual typography in responsive browser checks.
import { theme } from "@/app/theme";
import { BenefitsAnimation2 } from "./BenefitsAnimation2";

// Scope React's act environment to explicit updates. Browser-delivered
// observer callbacks still run normally between those boundaries.
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
async function update(action: () => void | Promise<void>) {
  const previous = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await act(action);
  } finally {
    if (previous === undefined) delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    else actEnvironment.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
const advance = (duration: number) =>
  update(async () => {
    await vi.advanceTimersByTimeAsync(duration);
  });

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
  return (matches: boolean) =>
    update(() => {
      query.matches = matches;
      query.dispatchEvent(new Event("change"));
    });
}

async function mount(colorScheme: "light" | "dark" = "light") {
  container = document.createElement("div");
  container.style.padding = "20px";
  document.body.appendChild(container);
  root = createRoot(container);
  await update(() =>
    root?.render(
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <BenefitsAnimation2 />
      </MantineProvider>,
    ),
  );
  await document.fonts.ready;
  // Allow the real IntersectionObserver to deliver visibility, then flush
  // React's resulting render/effects before installing the fake dwell clock.
  await update(async () => {
    await frame();
    await frame();
  });
}

function current() {
  const element = container.querySelector<HTMLElement>("[data-current]");
  if (!element) throw new Error("Missing current activity");
  return element;
}

afterEach(async () => {
  await cdp().send("Emulation.setCPUThrottlingRate", { rate: 1 });
  if (samplingFrame !== undefined) cancelAnimationFrame(samplingFrame);
  samplingFrame = undefined;
  await update(() => root?.unmount());
  root = undefined;
  container?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("BenefitsAnimation2", () => {
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
        `bounded conversation height at ${width}px`,
      ).toBeLessThanOrEqual(352);
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
  ] as const)("keeps messages readable and the video-call card unchanged across widths in %s mode", async (colorScheme) => {
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
      expect(
        scene.querySelector("[data-artifact-kind], dl, dt, dd"),
      ).toBeNull();
      expect(scene.textContent).not.toMatch(/\bAI\b/);
      expect(scene.querySelectorAll("[data-message]")).toHaveLength(7);
      const callRoom = cards[4].querySelector("[data-call-room]");
      expect(callRoom?.children).toHaveLength(2);
      expect(cards[4].querySelector("[data-message]")).toBeNull();
      for (const message of scene.querySelectorAll<HTMLElement>(
        "[data-message]",
      )) {
        const card = message.closest<HTMLElement>("[data-activity]");
        if (!card) throw new Error("Missing message card");
        const box = message.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        const style = getComputedStyle(message);
        const cardStyle = getComputedStyle(card);
        expect(box.left).toBeCloseTo(
          cardBox.left + Number.parseFloat(cardStyle.paddingLeft) + 1,
          1,
        );
        expect(box.right).toBeCloseTo(
          cardBox.right - Number.parseFloat(cardStyle.paddingRight) - 1,
          1,
        );
        expect(style.whiteSpace).toBe("normal");
        expect(style.textOverflow).not.toBe("ellipsis");
        expect(message.scrollWidth).toBeLessThanOrEqual(message.clientWidth);
        const lines = box.height / Number.parseFloat(style.lineHeight);
        expect(lines, `paragraph lines at ${width}px`).toBeGreaterThanOrEqual(
          0.9,
        );
        expect(lines, `paragraph lines at ${width}px`).toBeLessThanOrEqual(4.1);
        const body = card.querySelector<HTMLElement>("[data-message-body]");
        const bullets = card.querySelectorAll<HTMLElement>(
          "[data-message-body] li",
        );
        if (!body) throw new Error("Missing message body");
        expect(body.firstElementChild).toBe(message);
        const hasBullets = [0, 2, 3, 5].includes(Number(card.dataset.activity));
        expect(bullets).toHaveLength(hasBullets ? 2 : 0);
        expect(body.children).toHaveLength(hasBullets ? 2 : 1);
        for (const bullet of bullets) {
          const bulletStyle = getComputedStyle(bullet);
          expect(bulletStyle.fontSize).toBe(style.fontSize);
          expect(bulletStyle.lineHeight).toBe(style.lineHeight);
          expect(bulletStyle.fontWeight).toBe(style.fontWeight);
          expect(bullet.scrollWidth).toBeLessThanOrEqual(bullet.clientWidth);
        }
        const header = card.firstElementChild?.getBoundingClientRect();
        const footer = card.lastElementChild?.getBoundingClientRect();
        if (!header || !footer) throw new Error("Missing message chrome");
        expect(body.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          header.bottom + 5,
        );
        expect(body.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          footer.top - 5,
        );
        const range = document.createRange();
        range.selectNodeContents(message);
        for (const line of range.getClientRects()) {
          expect(line.left).toBeGreaterThanOrEqual(box.left - 1);
          expect(line.right).toBeLessThanOrEqual(box.right + 1);
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
        if (card.querySelector("[data-call-room]")) {
          expect(bounds.height, `unchanged call height at ${width}px`).toBe(
            width >= 768 && width < 1024
              ? 152
              : width >= 1024 && width < 1200
                ? 160
                : 168,
          );
        } else {
          expect(
            bounds.height,
            `modest message height at ${width}px`,
          ).toBeLessThanOrEqual(216);
          if (!card.querySelector("ul"))
            expect(bounds.height).toBeLessThan(
              cards[0].getBoundingClientRect().height,
            );
        }
        expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight);
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
          const mainRow = card.querySelector<HTMLElement>("[data-message]");
          if (author && mainRow) {
            expect(
              getComputedStyle(mainRow).fontSize,
              `main row matches author at ${width}px`,
            ).toBe(getComputedStyle(author).fontSize);
          }
        }
      }
      const tallestCard = Math.max(
        ...cards.map((card) => card.getBoundingClientRect().height),
      );
      const travelSpace =
        width < 768 ? 72 : width < 1024 ? 136 : width < 1200 ? 128 : 120;
      expect(scene.getBoundingClientRect().height).toBeCloseTo(
        tallestCard + travelSpace,
        1,
      );
      for (const text of scene.querySelectorAll<HTMLElement>(
        '[class*="issueCopy"] > *, [class*="messageMeta"] strong, [class*="label"], [class*="day"], [class*="detailText"], [class*="participantName"], [class*="mergeOutcome"], [class*="mergeHeading"] strong',
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

  it.each([
    1, 6,
  ])("progresses through review, optional call, approval and merge, then loops at %ix CPU slowdown", async (rate) => {
    await cdp().send("Emulation.setCPUThrottlingRate", { rate });
    const setReducedMotion = motionPreference(true);
    await mount();
    // Own every dwell timer, including the first one. Keep WAAPI and RAF real.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await setReducedMotion(false);
    expect(vi.getTimerCount()).toBe(1);

    const cardWidth = current().getBoundingClientRect().width;
    const scene = container.querySelector<HTMLElement>(
      '[data-benefits-animation="two"]',
    );
    if (!scene) throw new Error("Missing conversation");
    const sceneHeight = scene.getBoundingClientRect().height;
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
    // Only the first viewing has a shorter hold; regular loops retain 3.6s.
    await advance(1199);
    await frame();
    expect(current().dataset.activity).toBe("0");
    for (const [index, duration] of [
      1, 3000, 3600, 3200, 3200, 3600, 2600, 3200,
    ].entries()) {
      await advance(duration);
      await frame();
      await frame();
      expect(current().dataset.activity).toBe(String((index + 1) % 8));
      expect(current().getBoundingClientRect().width).toBeCloseTo(cardWidth, 1);
      expect(scene.getBoundingClientRect().height).toBeCloseTo(sceneHeight, 1);
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
    await advance(3599);
    await frame();
    expect(current().dataset.activity).toBe("0");
    await advance(1);
    await frame();
    expect(current().dataset.activity).toBe("1");
    expect(vi.getTimerCount()).toBe(1);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await update(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(vi.getTimerCount()).toBe(0);
    await advance(20000);
    await frame();
    expect(current().dataset.activity).toBe("1");
    hidden.mockReturnValue(false);
    await update(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(vi.getTimerCount()).toBe(1);
    await frame();
    expect(
      new DOMMatrixReadOnly(getComputedStyle(current()).transform).m42,
    ).toBe(8);
    await advance(2999);
    expect(current().dataset.activity).toBe("1");
    await advance(1);
    expect(current().dataset.activity).toBe("2");
  });

  it("responds to motion preference changes and stops timers on unmount", async () => {
    const setReducedMotion = motionPreference(true);
    await mount();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await setReducedMotion(false);
    expect(current().dataset.activity).toBe("0");
    expect(vi.getTimerCount()).toBe(1);
    await setReducedMotion(true);
    expect(vi.getTimerCount()).toBe(0);
    await advance(20000);
    expect(current().dataset.activity).toBe("2");
    expect(container.querySelector("button")).toBeNull();
    await setReducedMotion(false);
    expect(current().dataset.activity).toBe("0");
    expect(vi.getTimerCount()).toBe(1);
    await update(() => root?.unmount());
    root = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
});
