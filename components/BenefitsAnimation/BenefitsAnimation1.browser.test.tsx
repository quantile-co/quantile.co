import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Exercise the site's actual typography and color tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { type ReactNode, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Use the actual application theme.
import { theme } from "@/app/theme";
// biome-ignore lint/style/noRestrictedImports: Verify both visuals as injected by the page composition root.
import { BenefitsSection } from "../BenefitsSection/BenefitsSection";
import { BenefitsAnimation1 } from "./BenefitsAnimation1";
import { BenefitsAnimation2 } from "./BenefitsAnimation2";

const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
let container: HTMLDivElement;
let root: Root | undefined;
let preference: MediaQueryList;
function getElement(selector: string, parent: ParentNode = container) {
  const element = parent.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
function scene() {
  return getElement('[data-benefits-animation="one"]');
}
function opacity(selector: string) {
  return Number(getComputedStyle(getElement(selector, scene())).opacity);
}
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
  await frame();
}
async function mount(section = false, colorScheme: "light" | "dark" = "light") {
  function CheckoutForm({ children }: { children: ReactNode }) {
    return <form action="/storybook-checkout-preview">{children}</form>;
  }
  root?.render(
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        {section ? (
          <BenefitsSection
            CheckoutForm={CheckoutForm}
            onboardingVisual={<BenefitsAnimation1 />}
            expertiseVisual={<BenefitsAnimation2 />}
          />
        ) : (
          <div style={{ padding: 20 }}>
            <BenefitsAnimation1 />
          </div>
        )}
      </MantineProvider>
    </StrictMode>,
  );
  await vi.waitFor(() =>
    expect(
      container.querySelector('[data-benefits-animation="one"]'),
    ).not.toBeNull(),
  );
  await document.fonts.ready;
  await frame();
  await frame();
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

describe("BenefitsAnimation1", () => {
  it.each(["light", "dark"] as const)(
    "matches animation two's visible width with larger, borderless actions in %s mode",
    async (colorScheme) => {
      await mount(true, colorScheme);
      const one = scene();
      const two = getElement('[data-benefits-animation="two"]');
      const area = getElement("[data-onboarding-area]", one);
      expect(getElement('[data-issue="1"] strong', one).textContent).toBe(
        getElement('[class*="issueHeader"] strong', two).textContent,
      );
      expect(getElement('[class*="issueHeader"]', two).textContent).toContain(
        getElement('[data-issue="1"] [class*="issueNumber"]', one).textContent,
      );
      expect(
        one.querySelector('button, [data-activity], [class*="issueHeader"]'),
      ).toBeNull();
      expect(one.textContent).not.toContain("Your team, ready to build");
      const illustratedSubscribe = getComputedStyle(
        getElement("[data-subscribe]", one),
      );
      expect(illustratedSubscribe.color).toBe(getComputedStyle(one).color);
      const counterpartStyle = getComputedStyle(
        getElement("[data-current]", two),
      );
      const stripeShadow = getComputedStyle(
        getElement("[data-subscribe]", one),
      ).boxShadow;
      for (const surface of [
        getElement('[class*="paymentMethod"]', one),
        getElement("[data-subscribe]", one),
        getElement('[class*="issueCard"]', one),
        getElement("[data-quantity-control]", one),
        ...one.querySelectorAll<HTMLElement>('[class*="accessRow"] > div'),
      ]) {
        const style = getComputedStyle(surface);
        expect(style.backgroundColor).toBe(counterpartStyle.backgroundColor);
        expect(style.backgroundImage).toBe(counterpartStyle.backgroundImage);
        expect(style.boxShadow).toBe(
          surface.closest('[class*="accessRow"]')
            ? counterpartStyle.boxShadow
            : stripeShadow,
        );
      }
      expect(stripeShadow).not.toBe(counterpartStyle.boxShadow);
      expect(
        container.querySelectorAll("[data-benefits-animation]"),
      ).toHaveLength(2);
      expect(getElement("#benefits").textContent).toBe(
        "Rapid onboarding.\nMinimal overhead.",
      );
      expect(getElement("form").getAttribute("action")).toBe(
        "/storybook-checkout-preview",
      );
      expect(getElement('button[type="submit"]').textContent).toBe("Subscribe");
      const mergeStyle = getComputedStyle(
        getElement("[data-merge-stamp]", two),
      );
      for (const check of [
        getElement("[data-subscribed-label] > span", one),
        ...one.querySelectorAll<HTMLElement>("[data-access-check]"),
      ]) {
        const checkStyle = getComputedStyle(check);
        expect(checkStyle.backgroundColor).toBe(mergeStyle.backgroundColor);
        expect(checkStyle.color).toBe(mergeStyle.color);
        expect(checkStyle.borderRadius).toBe("50%");
        const size = check.hasAttribute("data-access-check") ? 14 : 12;
        expect(check.getBoundingClientRect().width).toBe(size);
        expect(check.getBoundingClientRect().height).toBe(size);
        const glyph = check.querySelector("svg");
        if (!glyph) throw new Error("Missing completion glyph");
        expect(glyph.getBoundingClientRect().width).toBeLessThan(size);
        expect(getComputedStyle(glyph).strokeWidth).toBe("3px");
      }
      for (const width of [
        320, 360, 375, 390, 425, 426, 472, 473, 480, 600, 767, 768, 820, 960,
        1023, 1024, 1200, 1440, 1920, 2560,
      ]) {
        await page.viewport(width, 1000);
        await frame();
        const counterpart = getElement("[data-current]", two);
        const author = getElement('[class*="messageMeta"] strong', counterpart);
        const introduction = one.closest<HTMLElement>("[data-has-visual]");
        const copy = introduction?.firstElementChild;
        if (!introduction || !copy)
          throw new Error("Missing section introduction");
        const bounds = area.getBoundingClientRect();
        const sceneBounds = one.getBoundingClientRect();
        // Conversation cards now fit their content; onboarding keeps its stage.
        expect(sceneBounds.height).toBe(width < 768 ? 240 : 288);
        expect(sceneBounds.width).toBe(two.getBoundingClientRect().width);
        const counterpartBounds = counterpart.getBoundingClientRect();
        expect(bounds.width).toBeCloseTo(counterpartBounds.width, 1);
        expect(bounds.left, `left edge at ${width}px`).toBeCloseTo(
          counterpartBounds.left,
          1,
        );
        expect(bounds.right, `right edge at ${width}px`).toBeCloseTo(
          counterpartBounds.right,
          1,
        );
        expect(
          (bounds.left + bounds.right) / 2,
          `horizontal center at ${width}px`,
        ).toBeCloseTo(
          (counterpartBounds.left + counterpartBounds.right) / 2,
          1,
        );
        expect(bounds.height).toBe(
          width >= 768 && width < 1024
            ? 200
            : width >= 1024 && width < 1200
              ? 208
              : 216,
        );
        for (const panel of one.querySelectorAll<HTMLElement>("[data-panel]")) {
          const panelBounds = panel.getBoundingClientRect();
          expect(panelBounds.top).toBe(bounds.top);
          expect(panelBounds.width).toBe(bounds.width);
          expect(panelBounds.height).toBe(bounds.height);
          expect(
            panel.scrollWidth,
            `${panel.dataset.panel} at ${width}px`,
          ).toBeLessThanOrEqual(panel.clientWidth);
          expect(
            panel.scrollHeight,
            `${panel.dataset.panel} at ${width}px`,
          ).toBeLessThanOrEqual(panel.clientHeight);
          expect(getComputedStyle(panel).borderWidth).toBe("0px");
          expect(getComputedStyle(panel).padding).toBe("0px");
          expect(getComputedStyle(panel).boxShadow).toBe("none");
          expect(getComputedStyle(panel).backgroundColor).toBe(
            "rgba(0, 0, 0, 0)",
          );
        }
        for (const text of one.querySelectorAll<HTMLElement>("strong")) {
          expect(
            Number.parseFloat(getComputedStyle(text).fontSize),
            `${text.textContent} at ${width}px`,
          ).toBe(Number.parseFloat(getComputedStyle(author).fontSize) + 2);
          expect(getComputedStyle(text).fontWeight).toBe(
            getComputedStyle(author).fontWeight,
          );
          const category = text.closest("[data-tool-card]");
          expect(getComputedStyle(text).whiteSpace).toBe(
            category && bounds.width <= 432 ? "normal" : "nowrap",
          );
          expect(getComputedStyle(text).textOverflow).toBe(
            category ? "clip" : "ellipsis",
          );
        }
        const categories = [0, 1, 3].map((index) =>
          getElement(`[data-tool-card="${index}"] strong`, one),
        );
        for (const category of categories) {
          const lineHeight = Number.parseFloat(
            getComputedStyle(category).lineHeight,
          );
          expect(
            Math.round(category.getBoundingClientRect().height / lineHeight),
            `${category.textContent} line count at ${width}px`,
          ).toBe(bounds.width <= 432 ? 2 : 1);
          expect(category.getBoundingClientRect().height).toBeCloseTo(
            categories[0].getBoundingClientRect().height,
            1,
          );
        }
        const avatar = getElement('[class*="accessHub"] [data-aj]', one);
        expect(avatar.getBoundingClientRect().width).toBe(64);
        expect(one.querySelector('[class*="accessHub"] strong')).toBeNull();
        expect(avatar.getBoundingClientRect().left + 32).toBeCloseTo(
          (bounds.left + bounds.right) / 2,
          1,
        );
        for (const card of one.querySelectorAll<HTMLElement>(
          "[data-tool-card]",
        )) {
          const detail = getElement("[data-tool-logos]", card);
          const name = getElement("strong", card);
          const detailStyle = getComputedStyle(detail);
          expect(detailStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
          const divider = getElement(
            "[data-tool-divider]",
            card,
          ).getBoundingClientRect();
          const logos = detail.getBoundingClientRect();
          expect(divider.height).toBe(1);
          expect(divider.left).toBeCloseTo(logos.left, 1);
          expect(divider.right).toBeCloseTo(logos.right, 1);
          expect(divider.top - name.getBoundingClientRect().bottom).toBeCloseTo(
            4,
            1,
          );
          expect(logos.top - divider.bottom).toBeCloseTo(4, 1);
          expect(detail.querySelectorAll("[data-system-logo]")).toHaveLength(3);
          expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
          const icon = getElement(
            "[data-tool-icon]",
            card,
          ).getBoundingClientRect();
          expect(icon.width).toBe(18);
          expect(icon.height).toBe(18);
          const cardBounds = card.getBoundingClientRect();
          expect(cardBounds.height).toBe((bounds.height - 32) / 2);
          expect(icon.top - cardBounds.top).toBeGreaterThanOrEqual(5);
          expect(cardBounds.bottom - logos.bottom).toBeGreaterThanOrEqual(5);
          expect(icon.top - cardBounds.top).toBeCloseTo(
            cardBounds.bottom - logos.bottom,
            1,
          );
          expect(name.getBoundingClientRect().top - icon.bottom).toBeCloseTo(
            1,
            1,
          );
          for (const logo of detail.querySelectorAll<SVGElement>(
            "[data-system-logo]",
          )) {
            expect(logo.getBoundingClientRect().width).toBe(17);
            expect(logo.getBoundingClientRect().height).toBe(17);
          }
          expect(
            detail.scrollWidth,
            `tool logos at ${width}px`,
          ).toBeLessThanOrEqual(detail.clientWidth);
          expect(
            card.scrollHeight,
            `tool height at ${width}px`,
          ).toBeLessThanOrEqual(card.clientHeight);
          expect(detail.getBoundingClientRect().top).toBeGreaterThan(
            name.getBoundingClientRect().bottom,
          );
          expect(detail.getBoundingClientRect().bottom).toBeLessThan(
            card.getBoundingClientRect().bottom,
          );
        }
        for (const selector of [
          "[data-subscribe]",
          '[class*="paymentMethod"]',
          '[class*="tools"]',
          '[class*="issueCard"]',
        ]) {
          for (const element of one.querySelectorAll<HTMLElement>(selector)) {
            const visible = element.getBoundingClientRect();
            expect(visible.left, `${selector} left at ${width}px`).toBeCloseTo(
              bounds.left,
              1,
            );
            expect(
              visible.right,
              `${selector} right at ${width}px`,
            ).toBeCloseTo(bounds.right, 1);
          }
        }
        const number = getElement("[data-card-number]", one);
        expect(number.textContent).toBe("•••• •••• •••• ••••");
        const fields = [
          ...one.querySelectorAll<HTMLElement>("[data-card-field]"),
        ];
        expect(fields.map((field) => field.dataset.cardField)).toEqual([
          "holder",
          "number",
          "expiry",
          "cvv",
        ]);
        expect(getComputedStyle(fields[0]).display === "none").toBe(
          bounds.width <= 352,
        );
        const visibleFields = fields.filter(
          (field) => getComputedStyle(field).display !== "none",
        );
        const gaps = visibleFields
          .slice(1)
          .map(
            (field, index) =>
              field.getBoundingClientRect().left -
              visibleFields[index].getBoundingClientRect().right,
          );
        expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.1);
        expect(getElement("[data-card-name]", one).textContent).toBe(
          "•••••• ••••••••",
        );
        expect(one.querySelector('[data-panel="email"]')).toBeNull();
        expect(
          number.scrollWidth,
          `card number at ${width}px`,
        ).toBeLessThanOrEqual(number.clientWidth);
        expect(getElement("[data-quantity-one]", one).textContent).toBe("1");
        expect(getElement("[data-quantity-zero]", one).textContent).toBe("0");
        expect(
          getElement('[class*="backlogAction"]', one).getBoundingClientRect()
            .right,
        ).toBeCloseTo(bounds.right, 1);
        expect(
          getElement('[class*="backlogHeading"] > strong', one).textContent,
        ).toBe("Issues");
        expect(one.querySelector('[class*="backlogSummary"]')).toBeNull();
        const textRects = Array.from(copy.children).flatMap((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return Array.from(range.getClientRects());
        });
        if (width >= 768) {
          const textRight = Math.max(...textRects.map((rect) => rect.right));
          const right = introduction.getBoundingClientRect().right;
          expect(bounds.left).toBeGreaterThan(textRight);
          expect(bounds.right).toBeLessThanOrEqual(right);
          const textCenter =
            (Math.min(...textRects.map((rect) => rect.top)) +
              Math.max(...textRects.map((rect) => rect.bottom))) /
            2;
          expect(
            Math.abs((bounds.top + bounds.bottom) / 2 - textCenter),
            `vertical centering at ${width}px`,
          ).toBeLessThan(16);
        } else {
          const subtitle = getElement("p", copy).getBoundingClientRect();
          const heading = getElement("h2", copy).getBoundingClientRect();
          const steps = getElement(
            "ol",
            introduction.parentElement as HTMLElement,
          ).getBoundingClientRect();
          expect(bounds.left).toBeCloseTo(heading.left, 0);
          expect(bounds.right).toBeCloseTo(sceneBounds.right, 0);
          if (width <= 425) expect(bounds.right).toBeCloseTo(subtitle.right, 0);
          expect(
            Math.abs(
              bounds.top - subtitle.bottom - (steps.top - bounds.bottom),
            ),
            `balanced gaps at ${width}px`,
          ).toBeLessThan(4);
          expect(getComputedStyle(getElement("p", copy)).textWrap).toBe(
            "pretty",
          );
        }
        expect(container.scrollWidth).toBeLessThanOrEqual(
          container.clientWidth,
        );
      }
    },
  );

  it.each([320, 768, 1440])(
    "fills the illustrated quantity and masked fields before subscribing at %ipx",
    async (width) => {
      await page.viewport(width, 1000);
      await mount();
      reduceMotion(false);
      const fields = ["holder", "number", "expiry", "cvv"];
      const hidden = (field: string) =>
        Number.parseFloat(
          getComputedStyle(getElement(`[data-fill="${field}"]`)).clipPath.split(
            " ",
          )[1],
        );
      const payment = getElement('[class*="paymentMethod"]');
      const bounds = payment.getBoundingClientRect();
      const quantity = getElement("[data-quantity-control]");
      const quantityBounds = quantity.getBoundingClientRect();
      const quantityBorder = getComputedStyle(quantity).borderColor;
      const outlined = (selector: string) => {
        const color = getComputedStyle(getElement(selector)).outlineColor;
        return !color.endsWith(", 0)") && !color.endsWith("/ 0)");
      };
      await seek(0.03);
      for (const field of fields) expect(hidden(field)).toBe(100);
      expect(opacity("[data-quantity-zero]")).toBe(1);
      expect(opacity("[data-quantity-one]")).toBe(0);
      await seek(0.28);
      expect(outlined("[data-quantity-control]")).toBe(true);
      expect(
        new DOMMatrixReadOnly(getComputedStyle(quantity).transform).m11,
      ).toBe(1);
      expect(outlined("[data-payment-method]")).toBe(false);
      await seek(0.55);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-quantity-plus]")).transform,
        ).m11,
      ).toBeCloseTo(0.78, 2);
      expect(
        new DOMMatrixReadOnly(getComputedStyle(quantity).transform).m11,
      ).toBeCloseTo(0.97, 2);
      expect(getComputedStyle(quantity).borderColor).toBe(quantityBorder);
      expect(quantity.getBoundingClientRect().width).toBeLessThan(
        quantityBounds.width,
      );
      expect(opacity("[data-quantity-one]")).toBe(0);
      await seek(0.8);
      expect(
        new DOMMatrixReadOnly(getComputedStyle(quantity).transform).m11,
      ).toBeCloseTo(1.01, 2);
      await seek(1);
      expect(opacity("[data-quantity-zero]")).toBe(0);
      expect(opacity("[data-quantity-one]")).toBe(1);
      expect(hidden("holder")).toBe(100);
      await seek(1.1);
      expect(
        new DOMMatrixReadOnly(getComputedStyle(quantity).transform).m11,
      ).toBe(1);
      expect(outlined("[data-quantity-control]")).toBe(true);
      expect(outlined("[data-payment-method]")).toBe(false);
      await seek(1.46);
      expect(outlined("[data-quantity-control]")).toBe(false);
      expect(outlined("[data-payment-method]")).toBe(true);
      expect(hidden("holder")).toBe(100);
      await seek(1.585);
      expect(hidden("holder")).toBeCloseTo(50, 0);
      expect(hidden("number")).toBe(100);
      await seek(1.935);
      expect(hidden("number")).toBeCloseTo(50, 0);
      expect(hidden("expiry")).toBe(100);
      await seek(2.255);
      expect(hidden("expiry")).toBeCloseTo(50, 0);
      expect(hidden("cvv")).toBe(100);
      await seek(2.465);
      expect(hidden("cvv")).toBeCloseTo(50, 0);
      await seek(2.8);
      for (const field of fields) expect(hidden(field)).toBe(0);
      expect(opacity("[data-subscribe-label]")).toBe(1);
      expect(opacity("[data-subscribed-label]")).toBe(0);
      expect(payment.getBoundingClientRect()).toEqual(bounds);
      expect(quantity.getBoundingClientRect()).toEqual(quantityBounds);
      await seek(2.92);
      expect(outlined("[data-subscribe]")).toBe(true);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-subscribe]")).transform,
        ).m11,
      ).toBe(1);
      await seek(3.73);
      expect(opacity("[data-subscribed-label]")).toBe(1);
      expect(outlined("[data-subscribe]")).toBe(false);
      await seek(12.64);
      for (const field of fields) expect(hidden(field)).toBe(100);
      expect(opacity("[data-quantity-zero]")).toBe(1);
      expect(opacity("[data-quantity-one]")).toBe(0);
      expect(opacity("[data-subscribe-label]")).toBe(1);
      expect(payment.getBoundingClientRect()).toEqual(bounds);
      expect(quantity.getBoundingClientRect()).toEqual(quantityBounds);
    },
  );

  it.each([320, 768, 1440])(
    "plays the same subscription, access, and assignment sequence at %ipx",
    async (width) => {
      await page.viewport(width, 1000);
      await mount();
      reduceMotion(false);
      const area = getElement("[data-onboarding-area]").getBoundingClientRect();
      await seek(0.5);
      expect(opacity('[data-panel="checkout"]')).toBe(1);
      expect(opacity("[data-subscribe-label]")).toBe(1);
      await seek(3.14);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-subscribe]")).transform,
        ).m11,
      ).toBeCloseTo(0.965, 3);
      const pressedShadow = getComputedStyle(
        getElement("[data-subscribe]"),
      ).boxShadow;
      expect(pressedShadow).not.toBe(
        getComputedStyle(getElement('[class*="issueCard"]')).boxShadow,
      );
      await seek(3.26);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-subscribe]")).transform,
        ).m11,
      ).toBeCloseTo(1.015, 3);
      for (const selector of [
        scene(),
        getElement('[data-panel="checkout"]'),
        getElement('[class*="checkoutBody"]'),
      ]) {
        expect(getComputedStyle(selector).overflow).toBe("visible");
      }
      await seek(3.7);
      expect(opacity("[data-subscribed-label]")).toBe(1);
      expect(opacity("[data-subscribe-label]")).toBe(0);
      await seek(4.5);
      expect(opacity('[data-panel="access"]')).toBe(1);
      expect(scene().querySelector('[data-panel="email"]')).toBeNull();
      await seek(4.45);
      expect(opacity('[data-panel="checkout"]')).toBe(0);
      expect(opacity('[data-access-check="0"]')).toBeGreaterThan(0);
      expect(opacity('[data-access-check="0"]')).toBeLessThan(1);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement('[data-tool-card="0"]')).transform,
        ).m11,
      ).toBeGreaterThan(1.04);
      await seek(5.17);
      expect(opacity('[data-panel="access"]')).toBe(1);
      expect(opacity('[data-access-check="0"]')).toBe(1);
      expect(opacity('[data-access-check="3"]')).toBe(0);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement('[data-tool-card="1"]')).transform,
        ).m11,
      ).toBeGreaterThan(1.04);
      expect(
        getComputedStyle(getElement('[data-tool-icon="1"]')).transform,
      ).toBe("none");
      await seek(7.39);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-aj-hub]")).transform,
        ).m11,
      ).toBeGreaterThan(1.07);
      for (let index = 0; index < 4; index++) {
        expect(opacity(`[data-access-check="${index}"]`)).toBe(1);
        expect(
          Number.parseFloat(
            getComputedStyle(getElement(`[data-connection="${index}"]`))
              .strokeDashoffset,
          ),
        ).toBeCloseTo(
          (
            getElement(
              `[data-connection="${index}"]`,
            ) as unknown as SVGPathElement
          ).getTotalLength() * 0.28,
          2,
        );
      }
      await seek(8.1);
      expect(opacity('[data-panel="access"]')).toBe(1);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-aj-hub]")).transform,
        ).m11,
      ).toBe(1);
      expect(opacity('[data-panel="backlog"]')).toBe(0);
      await seek(8.8);
      expect(opacity('[data-panel="backlog"]')).toBe(1);
      const first = getElement('[data-issue="0"]');
      const promoted = getElement('[data-issue="1"]');
      expect(promoted.getBoundingClientRect().top).toBeGreaterThan(
        first.getBoundingClientRect().top,
      );
      await seek(9.75);
      expect(promoted.getBoundingClientRect().bottom).toBeCloseTo(
        first.getBoundingClientRect().top,
        0,
      );
      expect(opacity("[data-priority-high]")).toBe(1);
      await seek(10.75);
      expect(opacity("[data-assignee]")).toBe(1);
      expect(opacity("[data-status-progress]")).toBe(1);
      expect(opacity("[data-status-todo]")).toBe(0);
      expect(opacity("[data-backlog-progress]")).toBe(1);
      await seek(11.6);
      expect(opacity('[data-panel="backlog"]')).toBe(1);
      expect(opacity("[data-status-progress]")).toBe(1);
      await seek(12.69);
      expect(opacity('[data-panel="checkout"]')).toBe(1);
      expect(opacity("[data-subscribe-label]")).toBe(1);
      expect(opacity('[data-panel="backlog"]')).toBe(0);
      for (const panel of scene().querySelectorAll<HTMLElement>(
        "[data-panel]",
      )) {
        // Only the elements doing work move; there is no rotating/stacking shell.
        expect(getComputedStyle(panel).transform).toBe("none");
        expect(panel.getBoundingClientRect().top).toBe(area.top);
      }
      expect(
        getElement("[data-onboarding-area]").getBoundingClientRect().height,
      ).toBe(area.height);
    },
  );

  it("reorders both issues in one continuous movement without a midpoint hesitation or width change", async () => {
    await mount();
    reduceMotion(false);
    const promoted = getElement('[data-issue="1"]');
    const first = getElement('[data-issue="0"]');
    const width = getElement("[data-onboarding-area]").getBoundingClientRect()
      .width;
    const samples: number[] = [];
    for (const time of [9.39, 9.42, 9.45]) {
      await seek(time);
      const displacement = new DOMMatrixReadOnly(
        getComputedStyle(promoted).transform,
      ).m42;
      samples.push(displacement);
      expect(
        new DOMMatrixReadOnly(getComputedStyle(first).transform).m42,
      ).toBeCloseTo(-displacement, 1);
      expect(promoted.getBoundingClientRect().width).toBe(width);
      expect(first.getBoundingClientRect().width).toBe(width);
    }
    const minTravel = promoted.getBoundingClientRect().height * 0.05;
    expect(samples[0] - samples[1]).toBeGreaterThan(minTravel);
    expect(samples[1] - samples[2]).toBeGreaterThan(minTravel);
  });

  it.each([
    [320, "light"],
    [768, "light"],
    [1440, "light"],
    [320, "dark"],
    [1440, "dark"],
  ] as const)(
    "sends one highlight from each system to AJ without screen-space dash repetition at %ipx in %s mode",
    async (width, colorScheme) => {
      await page.viewport(width, 1000);
      await mount(false, colorScheme);
      reduceMotion(false);
      await seek(0.28);
      const focusColor = getComputedStyle(
        getElement("[data-quantity-control]"),
      ).outlineColor;
      // WAAPI serializes the animated outline in OKLab, while the SVG stroke
      // serializes the same color-mix in sRGB. Compare rendered colors instead.
      const pixels = (color: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing canvas context");
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      const focusPixels = pixels(focusColor);
      for (let index = 0; index < 4; index++) {
        const at = 4.35 + index * 0.72;
        const arrival = at + 0.55;
        const maskPath = getElement(
          `[data-connection="${index}"]`,
        ) as unknown as SVGPathElement;
        const signal = getElement(`[data-connection-signal="${index}"]`);
        const card = getElement(`[data-tool-card="${index}"]`);
        const icon = getElement(`[data-tool-icon="${index}"]`);
        const check = getElement(`[data-access-check="${index}"]`);
        const length = maskPath.getTotalLength();
        const beam = length * 0.28;
        const offset = () =>
          Number.parseFloat(getComputedStyle(maskPath).strokeDashoffset);
        // Dashed geometry MUST scale inside the mask; only the solid visible
        // stroke is non-scaling. Mixing these caused broken desktop connectors.
        expect(getComputedStyle(maskPath).vectorEffect).toBe("none");
        expect(getComputedStyle(signal).vectorEffect).toBe(
          "non-scaling-stroke",
        );
        expect(getComputedStyle(signal).strokeDasharray).toBe("none");
        pixels(getComputedStyle(signal).stroke).forEach((channel, index) => {
          expect(Math.abs(channel - focusPixels[index])).toBeLessThanOrEqual(1);
        });
        expect(
          getComputedStyle(getElement(`[class*="connectionTrack"]`)).opacity,
        ).toBe("0.18");
        expect(signal.getAttribute("mask")).toBe(
          `url(#${maskPath.parentElement?.id})`,
        );
        expect(getComputedStyle(signal).opacity).toBe("1");
        if (index > 0) {
          await seek(at - 0.62);
          expect(opacity(`[data-access-check="${index - 1}"]`)).toBeGreaterThan(
            0,
          );
          expect(opacity(`[data-access-check="${index - 1}"]`)).toBeLessThan(1);
          expect(
            new DOMMatrixReadOnly(getComputedStyle(card).transform).m11,
          ).toBe(1);
        }
        await seek(at);
        if (index > 0) {
          expect(opacity(`[data-access-check="${index - 1}"]`)).toBe(1);
          const previousPath = getElement(
            `[data-connection="${index - 1}"]`,
          ) as unknown as SVGPathElement;
          expect(
            Number.parseFloat(getComputedStyle(previousPath).strokeDashoffset),
          ).toBeCloseTo(previousPath.getTotalLength() * 0.28, 2);
        }
        const initialBorder = getComputedStyle(card).borderTopColor;
        expect(offset()).toBeCloseTo(-length, 3);
        const [dash, gap] = getComputedStyle(maskPath)
          .strokeDasharray.split(/[, ]+/)
          .map(Number.parseFloat);
        expect(dash).toBeCloseTo(beam, 3);
        expect(gap).toBeCloseTo(length + beam, 3);
        expect(maskPath.getAttribute("d")).toMatch(/Q.*V.*Q/);
        await seek(at + 0.1);
        expect(offset()).toBeCloseTo(-length, 3);
        expect(opacity(`[data-access-check="${index}"]`)).toBeGreaterThan(0);
        expect(opacity(`[data-access-check="${index}"]`)).toBeLessThan(1);
        expect(getComputedStyle(card).borderTopColor).not.toBe(initialBorder);
        expect(
          new DOMMatrixReadOnly(getComputedStyle(card).transform).m11,
        ).toBeGreaterThan(1.04);
        expect(getComputedStyle(icon).transform).toBe("none");
        await seek(at + 0.24);
        expect(opacity(`[data-access-check="${index}"]`)).toBe(1);
        expect(offset()).toBeCloseTo(-length, 3);
        await seek(at + 0.4);
        expect(offset()).toBeCloseTo((beam - length) / 2, 2);
        expect(opacity(`[data-access-check="${index}"]`)).toBe(1);
        await seek(arrival + 0.15);
        expect(offset()).toBeCloseTo(beam, 2);
        expect(opacity(`[data-access-check="${index}"]`)).toBe(1);
        expect(getComputedStyle(check).backgroundColor).toBe(
          getComputedStyle(icon).color,
        );
        expect(getComputedStyle(check).color).toBe(
          getComputedStyle(card).backgroundColor,
        );
        expect(getComputedStyle(card).borderTopColor).not.toBe(initialBorder);
        expect(
          new DOMMatrixReadOnly(getComputedStyle(card).transform).m11,
        ).toBe(1);
      }
      const finishedBorder = getComputedStyle(
        getElement('[data-tool-card="0"]'),
      ).borderTopColor;
      await seek(8.1);
      for (let index = 0; index < 4; index++) {
        expect(
          getComputedStyle(getElement(`[data-tool-card="${index}"]`))
            .borderTopColor,
        ).toBe(finishedBorder);
      }
      await seek(8.5);
      expect(
        getComputedStyle(getElement('[data-tool-card="0"]')).borderTopColor,
      ).not.toBe(finishedBorder);
      await seek(7.39);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-aj-hub]")).transform,
        ).m11,
      ).toBeGreaterThan(1.07);
      await seek(7.65);
      expect(
        new DOMMatrixReadOnly(
          getComputedStyle(getElement("[data-aj-hub]")).transform,
        ).m11,
      ).toBe(1);
    },
  );

  it("pauses its timeline offscreen and in hidden tabs and cleans up on preference changes/unmount", async () => {
    await mount();
    expect(scene().getAnimations({ subtree: true })).toHaveLength(0);
    expect(opacity('[data-panel="backlog"]')).toBe(1);
    reduceMotion(false);
    await vi.waitFor(() =>
      expect(
        scene()
          .getAnimations({ subtree: true })
          .every((animation) => animation.playState === "running"),
      ).toBe(true),
    );
    await seek(8.2);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    const animation = scene().getAnimations({ subtree: true })[0];
    const heldTime = animation.currentTime;
    await frame();
    await frame();
    expect(animation.playState).toBe("paused");
    expect(animation.currentTime).toBe(heldTime);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await frame();
    await frame();
    expect(animation.playState).toBe("running");
    expect(Number(animation.currentTime)).toBeGreaterThanOrEqual(
      Number(heldTime),
    );
    container.style.marginTop = "200vh";
    await vi.waitFor(() => expect(animation.playState).toBe("paused"));
    const offscreenTime = animation.currentTime;
    await frame();
    await frame();
    expect(animation.currentTime).toBe(offscreenTime);
    container.style.marginTop = "0";
    await vi.waitFor(() => expect(animation.playState).toBe("running"));
    reduceMotion(true);
    expect(scene().getAnimations({ subtree: true })).toHaveLength(0);
    expect(opacity('[data-panel="backlog"]')).toBe(1);
    expect(opacity('[data-panel="checkout"]')).toBe(0);
    for (const field of ["holder", "number", "expiry", "cvv"]) {
      expect(
        getComputedStyle(getElement(`[data-fill="${field}"]`)).clipPath,
      ).toBe("none");
    }
    expect(opacity("[data-quantity-one]")).toBe(1);
    expect(opacity("[data-quantity-zero]")).toBe(0);
    for (const selector of [
      "[data-quantity-control]",
      "[data-payment-method]",
      "[data-subscribe]",
    ]) {
      expect(getComputedStyle(getElement(selector)).outlineColor).toBe(
        "rgba(0, 0, 0, 0)",
      );
    }
    expect(opacity("[data-status-progress]")).toBe(1);
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
