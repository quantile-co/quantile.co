import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { HeroAnimation } from "@/components/HeroAnimation/HeroAnimation";
import { HeroSection } from "@/components/HeroSection/HeroSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { CompactSocialProof } from "@/components/SocialProofSection/SocialProofSection";
import { theme } from "./theme";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return (
    <form action="/storybook-checkout-preview" method="post">
      {children}
    </form>
  );
}

const previewCheckoutActions = {
  desktop: (
    <PreviewCheckoutForm>
      <button type="submit">Start building</button>
    </PreviewCheckoutForm>
  ),
  mobile: (
    <PreviewCheckoutForm>
      <button type="submit">Start building</button>
    </PreviewCheckoutForm>
  ),
};

let container: HTMLDivElement;
let root: Root;
let initialViewport: { width: number; height: number };

beforeAll(async () => {
  initialViewport = { width: window.innerWidth, height: window.innerHeight };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider theme={theme}>
      <HeroSection
        description="Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches."
        CheckoutForm={PreviewCheckoutForm}
        title={"Fractional data\nand AI engineering"}
        visual={<HeroAnimation />}
      />
    </MantineProvider>,
  );
  await vi.waitFor(() => expect(container.querySelector("h1")).not.toBeNull());
  await document.fonts.ready;
});

afterAll(async () => {
  root.unmount();
  container.remove();
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("homepage hero layout", () => {
  it("keeps the two-line headline and subtitle clear of the animation", async () => {
    const title = container.querySelector("h1");
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe("Fractional data\nand AI engineering");
    const description = container.querySelector("section p");
    const visual = container.querySelector<HTMLElement>(
      'section [class*="visual"]',
    );
    expect(visual).not.toBeNull();
    const fileIcon = container.querySelector<SVGElement>(
      "svg.tabler-icon-file-text",
    );
    const fileName = container.querySelector<HTMLElement>(
      '[class*="fileName"]',
    );
    expect(fileIcon).not.toBeNull();
    expect(fileName?.textContent).toBe("evals.py");
    expect(description?.textContent).toBe(
      "Fast, flexible, senior data + AI engineering capacity without expensive hires or agency headaches.",
    );
    const form = container.querySelector("form");
    expect(form?.getAttribute("action")).toBe("/storybook-checkout-preview");
    expect(form?.getAttribute("method")).toBe("post");
    expect(form?.querySelector('button[type="submit"]')?.textContent).toBe(
      "Start building",
    );

    for (const width of [
      320, 328, 360, 390, 425, 446, 447, 466, 467, 480, 767, 768, 850, 900, 960,
      1024, 1088, 1089, 1100, 1161, 1162, 1200, 1201, 1365, 1920,
    ]) {
      await page.viewport(width, 900);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const heading = title as HTMLElement;
      const height = heading.getBoundingClientRect().height;
      const lineHeight = Number.parseFloat(
        getComputedStyle(heading).lineHeight,
      );
      expect(Math.round(height / lineHeight), `at ${width}px`).toBe(2);
      expect(heading.scrollWidth, `at ${width}px`).toBeLessThanOrEqual(
        heading.clientWidth + 1,
      );
      if (width === 390 && fileIcon) {
        expect(getComputedStyle(fileIcon).display).not.toBe("none");
      }
      if ([320, 390, 768, 1024].includes(width) && fileName) {
        expect(fileName.scrollWidth, `file at ${width}px`).toBeLessThanOrEqual(
          fileName.clientWidth + 1,
        );
      }
      if (description) {
        const descriptionStyle = getComputedStyle(description);
        if (width === 320) {
          expect(descriptionStyle.fontSize).toBe("15px");
          const firstLine = "Fast, flexible, senior data + AI engineering";
          expect(description.textContent?.startsWith(firstLine)).toBe(true);
          const textRange = document.createRange();
          textRange.setStart(description.firstChild as Text, 0);
          textRange.setEnd(description.firstChild as Text, firstLine.length);
          expect(textRange.getClientRects()).toHaveLength(1);
        }
        const descriptionLineHeight = Number.parseFloat(
          descriptionStyle.lineHeight,
        );
        const descriptionLines = Math.round(
          description.getBoundingClientRect().height / descriptionLineHeight,
        );
        expect(descriptionStyle.textWrap, `at ${width}px`).toBe(
          descriptionLines >= 3 ? "pretty" : "balance",
        );
        expect(
          description.scrollWidth,
          `description at ${width}px`,
        ).toBeLessThanOrEqual(description.clientWidth + 1);
        if (width >= 768 && visual) {
          const visualBounds = visual.getBoundingClientRect();
          const descriptionText = document.createRange();
          descriptionText.selectNodeContents(description);
          for (const line of descriptionText.getClientRects()) {
            if (
              line.bottom > visualBounds.top &&
              line.top < visualBounds.bottom
            ) {
              expect(
                line.right,
                `subtitle/animation gap at ${width}px`,
              ).toBeLessThanOrEqual(visualBounds.left + 1);
            }
          }
        }
        if (width === 1024) {
          expect(descriptionLines).toBe(2);
        }
      }
    }
  });

  it("keeps mobile drawer semantics and keyboard handling while submitting a local form", async () => {
    await page.viewport(390, 844);
    root.render(
      <MantineProvider theme={theme}>
        <SiteHeader
          bookCallHref="#book-a-call"
          checkoutActions={previewCheckoutActions}
          homeHref="/"
          logo={<span>Quantile</span>}
          sections={[]}
        />
      </MantineProvider>,
    );
    const toggle = await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Toggle navigation"]',
      );
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    });
    toggle.focus();
    toggle.click();
    const form = await vi.waitFor(() => {
      const element = document.querySelector<HTMLFormElement>(
        "#mobile-navigation-drawer form",
      );
      expect(element).not.toBeNull();
      return element as HTMLFormElement;
    });
    expect(form.getAttribute("action")).toBe("/storybook-checkout-preview");
    expect(form.getAttribute("method")).toBe("post");

    const dialog = form.closest('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.querySelector("header")?.getAttribute("role")).toBe(
      "presentation",
    );
    const titleId = dialog?.getAttribute("aria-labelledby");
    expect(titleId && document.getElementById(titleId)?.textContent).toBe(
      "Quantile",
    );
    expect(
      document.querySelectorAll('header:not([role="presentation"])'),
    ).toHaveLength(1);
    await vi.waitFor(() =>
      expect(dialog?.contains(document.activeElement)).toBe(true),
    );
    // Traverse past both ends, including the logo and close button. Removing
    // the header landmark must not remove its descendants from keyboard use.
    for (let index = 0; index < 8; index += 1) {
      await userEvent.keyboard("{Tab}");
      expect(dialog?.contains(document.activeElement)).toBe(true);
    }
    for (let index = 0; index < 8; index += 1) {
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
      expect(dialog?.contains(document.activeElement)).toBe(true);
    }

    let submitted = false;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitted = true;
    });
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    expect(submitted).toBe(true);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeNull(),
    );
    await vi.waitFor(() => expect(document.activeElement).toBe(toggle));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("homepage navigation anchors", () => {
  it("places Benefits, Pricing, and FAQ at the same distance below the header", async () => {
    await page.viewport(1200, 900);
    const anchorContainer = document.createElement("div");
    document.body.appendChild(anchorContainer);
    const anchorRoot = createRoot(anchorContainer);

    try {
      anchorRoot.render(
        <MantineProvider theme={theme}>
          <div style={{ height: "100vh" }} />
          <BenefitsSection CheckoutForm={PreviewCheckoutForm} />
          <PricingSection CheckoutForm={PreviewCheckoutForm} />
          <FaqSection
            billingPortalLoginUrl="/portal-preview"
            compactProof={<CompactSocialProof />}
            CheckoutForm={PreviewCheckoutForm}
          />
          <div style={{ height: "100vh" }} />
        </MantineProvider>,
      );
      await vi.waitFor(() =>
        expect(anchorContainer.querySelector("#faq")).not.toBeNull(),
      );
      await document.fonts.ready;

      const anchorTops = [];
      for (const id of ["benefits", "pricing", "faq"]) {
        const anchor = anchorContainer.querySelector<HTMLElement>(`#${id}`);
        if (!anchor) throw new Error(`Missing ${id} anchor`);
        anchor.scrollIntoView();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        anchorTops.push(anchor.getBoundingClientRect().top);
      }

      expect(anchorTops[0]).toBeCloseTo(anchorTops[1], 0);
      expect(anchorTops[1]).toBeCloseTo(anchorTops[2], 0);
    } finally {
      anchorRoot.unmount();
      anchorContainer.remove();
      window.scrollTo(0, 0);
    }
  });
});
