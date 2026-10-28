import "@fontsource-variable/outfit";
// biome-ignore lint/style/noRestrictedImports: Layout tests need actual typography and tokens.
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
// biome-ignore lint/style/noRestrictedImports: Verify the actual application theme.
import { theme } from "@/app/theme";
import { FounderProfile, SocialProofSection } from "./SocialProofSection";
import classes from "./SocialProofSection.module.css";

let container: HTMLDivElement;
let root: Root;
const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};

async function renderProof(colorScheme: "light" | "dark", column: number) {
  container = document.createElement("div");
  container.style.setProperty("--site-content-width", `${column}px`);
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <SocialProofSection ariaLabel="Experience" flushCarousel />
      <FounderProfile />
    </MantineProvider>,
  );
  await vi.waitFor(() =>
    expect(container.querySelectorAll("article")).toHaveLength(5),
  );
  await document.fonts.ready;
}

function element(scope: Element, className: string) {
  const result = scope.querySelector<HTMLElement>(`.${className}`);
  if (!result) throw new Error(`Missing ${className}`);
  return result;
}

function checkCards(cards: HTMLElement[], sameRow = true) {
  const measurements = cards.map((card) => {
    const square = element(card, classes.mediaSquare).getBoundingClientRect();
    const content = element(card, classes.proofContent);
    const bounds = content.getBoundingClientRect();
    const rows = [...content.children].map((row) =>
      row.getBoundingClientRect(),
    );
    expect(square.width).toBeCloseTo(square.height, 1);
    expect(bounds.top).toBeCloseTo(square.top, 1);
    expect(bounds.bottom).toBeCloseTo(square.bottom, 1);
    expect(rows[0].top).toBeCloseTo(square.top, 1);
    expect(rows[2].bottom).toBeCloseTo(square.bottom, 1);
    for (const [index, row] of rows.entries()) {
      expect(row.left).toBeCloseTo(bounds.left, 1);
      expect(row.right).toBeLessThanOrEqual(bounds.right + 1);
      if (index > 0) expect(row.top).toBeGreaterThan(rows[index - 1].bottom);
    }
    for (const text of content.querySelectorAll<HTMLElement>("p, span")) {
      expect(text.scrollWidth, text.textContent ?? "text").toBeLessThanOrEqual(
        text.clientWidth + 1,
      );
    }
    if (card.hasAttribute("data-profile")) {
      const description = element(card, classes.profileDescription);
      expect(rows[2].top - rows[1].bottom).toBeCloseTo(
        rows[1].top - rows[0].bottom,
        1,
      );
      expect(description.children).toHaveLength(3);
      const walker = document.createTreeWalker(
        description,
        NodeFilter.SHOW_TEXT,
      );
      const lines: DOMRect[] = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        lines.push(range.getBoundingClientRect());
      }
      expect(lines).toHaveLength(3);
      expect(lines[1].top - lines[0].top).toBeCloseTo(
        lines[2].top - lines[1].top,
        1,
      );
      expect(card.querySelectorAll("a")).toHaveLength(0);
    }
    const customers = [
      ...content.querySelectorAll<HTMLElement>(`.${classes.customer}`),
    ];
    if (customers.length) {
      const caption = element(content, classes.clientsLabel);
      const captionBounds = caption.getBoundingClientRect();
      const firstLogo = element(
        customers[0],
        classes.customerLogo,
      ).getBoundingClientRect();
      expect(caption.textContent).toBe("Clients:");
      expect(captionBounds.left).toBeCloseTo(firstLogo.left, 1);
      expect(firstLogo.top - captionBounds.bottom).toBeCloseTo(
        Number.parseFloat(getComputedStyle(card).fontSize) * 0.1875 + 1,
        1,
      );
      // Leave breathing room below the context/divider line, even at 768px.
      expect(captionBounds.top - rows[1].bottom).toBeGreaterThanOrEqual(2);
      expect(
        Number.parseFloat(getComputedStyle(caption).fontSize),
      ).toBeLessThan(
        Number.parseFloat(
          getComputedStyle(element(customers[0], classes.customerName))
            .fontSize,
        ),
      );
      expect(content.children[1].textContent).not.toContain("Clients:");
    }
    if (customers.length) {
      const context = element(card, classes.experienceContext);
      const contextSize = Number.parseFloat(getComputedStyle(context).fontSize);
      const parts = [...context.children];
      for (let index = 1; index < parts.length; index++) {
        const previous = parts[index - 1].getBoundingClientRect();
        const current = parts[index].getBoundingClientRect();
        expect(current.top).toBeCloseTo(previous.top, 1);
        expect(current.left - previous.right).toBeCloseTo(
          contextSize * 0.375,
          1,
        );
        expect(
          Number.parseFloat(getComputedStyle(parts[index]).paddingLeft),
        ).toBeCloseTo(contextSize * 0.375, 1);
      }
      const groups = customers.map((customer) =>
        customer.getBoundingClientRect(),
      );
      expect(groups[0].left).toBeCloseTo(bounds.left, 1);
      if (window.innerWidth >= 768) {
        expect(groups[2].right).toBeCloseTo(bounds.right, 1);
      } else {
        expect(groups[2].right).toBeLessThan(bounds.right);
        expect(groups[1].left - groups[0].right).toBeCloseTo(
          Number.parseFloat(getComputedStyle(card).fontSize) * 0.625,
          1,
        );
      }
      expect(groups[1].left - groups[0].right).toBeCloseTo(
        groups[2].left - groups[1].right,
        1,
      );
      expect(
        Number.parseFloat(
          getComputedStyle(element(content, classes.clientsLabel)).fontSize,
        ),
      ).toBeCloseTo(
        Math.max(6, Number.parseFloat(getComputedStyle(card).fontSize) * 0.5),
        1,
      );
    }
    for (const [index, customer] of customers.entries()) {
      const logo = element(
        customer,
        classes.customerLogo,
      ).getBoundingClientRect();
      const label = element(
        customer,
        classes.customerName,
      ).getBoundingClientRect();
      expect(label.left).toBeCloseTo(logo.left, 1);
      expect(label.top).toBeGreaterThan(logo.bottom);
      expect(label.bottom).toBeCloseTo(square.bottom, 1);
      expect(logo.top).toBeCloseTo(
        element(customers[0], classes.customerLogo).getBoundingClientRect().top,
        1,
      );
      if (index > 0)
        expect(customer.getBoundingClientRect().left).toBeGreaterThan(
          customers[index - 1].getBoundingClientRect().right,
        );
    }
    return {
      square,
      rows,
      customerTop: customers[0]?.getBoundingClientRect().top,
      gap: bounds.left - square.right,
      card: card.getBoundingClientRect(),
    };
  });
  if (!sameRow) return;
  const companies = measurements.filter(
    (measurement) => measurement.customerTop !== undefined,
  );
  for (const company of companies) {
    expect(company.customerTop).toBeCloseTo(companies[0].customerTop ?? 0, 1);
    expect(company.rows[2].top).toBeCloseTo(companies[0].rows[2].top, 1);
  }
  for (const [index, current] of measurements.entries()) {
    expect(current.square.width).toBeCloseTo(measurements[0].square.width, 1);
    expect(current.square.top).toBeCloseTo(measurements[0].square.top, 1);
    expect(current.gap).toBeCloseTo(measurements[0].gap, 1);
    expect(current.rows[0].top).toBeCloseTo(measurements[0].rows[0].top, 1);
    expect(current.rows[1].top).toBeCloseTo(measurements[0].rows[1].top, 1);
    expect(current.rows[2].bottom).toBeCloseTo(
      measurements[0].rows[2].bottom,
      1,
    );
    expect(current.card.width).toBeCloseTo(measurements[0].card.width, 1);
    if (index > 0)
      expect(current.card.left).toBeGreaterThanOrEqual(
        measurements[index - 1].card.right - 1,
      );
  }
}

afterEach(async () => {
  root?.unmount();
  container?.remove();
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("social proof alignment", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const column of [960, 1200]) {
      it(`aligns every text row, square and customer baseline in a ${column}px column (${colorScheme})`, async () => {
        await renderProof(colorScheme, column);
        for (const width of [
          320, 360, 390, 425, 426, 576, 577, 660, 767, 768, 800, 1024, 1280,
          1440, 1920,
        ]) {
          await page.viewport(width, 900);
          await vi.waitFor(() => {
            const cards = [
              ...container.querySelectorAll<HTMLElement>(
                "section[aria-label='Experience'] article",
              ),
            ];
            const active = cards.filter(
              (card) => !card.hasAttribute("aria-hidden"),
            );
            expect(active).toHaveLength(width <= 576 ? 1 : width < 768 ? 2 : 4);
            checkCards(cards);
            const standalone = container.querySelector<HTMLElement>(
              `.${classes.founderProfile} article`,
            );
            if (!standalone) throw new Error("Missing standalone profile");
            checkCards([standalone], false);
          });
        }
      });
    }
  }

  for (const width of [390, 660]) {
    it(`keeps every carousel page aligned without social links at ${width}px`, async () => {
      await page.viewport(width, 900);
      await renderProof("light", 960);
      await userEvent.hover(element(container, classes.founderProfile));
      const seen = new Set<string>();
      const proof = container.querySelector("section[aria-label='Experience']");
      if (!proof) throw new Error("Missing proof");
      const carousel = element(proof, classes.experienceGrid);
      await vi.waitFor(() =>
        expect(carousel.getAttribute("aria-roledescription")).toBe("carousel"),
      );
      let expectedHeight: number | undefined;
      const pages = width <= 576 ? 4 : 2;
      for (let index = 0; index < pages; index++) {
        const titles = await vi.waitFor(
          () => {
            const active = [
              ...proof.querySelectorAll<HTMLElement>(
                "article:not([aria-hidden])",
              ),
            ];
            expect(active).toHaveLength(width <= 576 ? 1 : 2);
            const title =
              element(active[0], classes.proofTitle).textContent ?? "";
            expect(seen.has(title)).toBe(false);
            checkCards(active);
            const height = proof.getBoundingClientRect().height;
            if (expectedHeight !== undefined)
              expect(height).toBeCloseTo(expectedHeight, 1);
            expectedHeight = height;
            for (const card of active) {
              expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(
                width,
              );
              expect(card.querySelectorAll("a")).toHaveLength(0);
            }
            expect(proof.querySelectorAll("a")).toHaveLength(0);
            return active.map(
              (card) => element(card, classes.proofTitle).textContent ?? "",
            );
          },
          { timeout: 4500 },
        );
        for (const title of titles) seen.add(title);
      }
      expect([...seen].sort()).toEqual([
        "AJ Welch",
        "Chartio",
        "CompilerWorks",
        "Google",
      ]);
    }, 20000);
  }
});
