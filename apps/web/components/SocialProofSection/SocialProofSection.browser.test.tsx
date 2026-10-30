import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { SocialProofSection } from "./SocialProofSection";
import classes from "./SocialProofSection.module.css";

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

it("cycles through all three company cards with only the active card accessible", async () => {
  await page.viewport(390, 844);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <MantineProvider>
      <SocialProofSection ariaLabel="Experience" />
    </MantineProvider>,
  );
  await vi.waitFor(() =>
    expect(
      container.querySelector('[aria-roledescription="carousel"]'),
    ).not.toBeNull(),
  );
  // Keep the pointer outside the carousel so hover does not pause rotation.
  await userEvent.hover(document.body);
  const proof = container.querySelector(
    'section[aria-label="Experience"]',
  ) as HTMLElement;
  const seen = new Set<string>();
  for (let index = 0; index < 3; index++) {
    const title = await vi.waitFor(
      () => {
        const active = proof.querySelectorAll("article:not([aria-hidden])");
        expect(active).toHaveLength(1);
        const title =
          active[0].querySelector(`.${classes.proofTitle}`)?.textContent ?? "";
        expect(seen.has(title)).toBe(false);
        return title;
      },
      { timeout: 4500 },
    );
    seen.add(title);
  }
  expect([...seen].sort()).toEqual(["Chartio", "CompilerWorks", "Google"]);
}, 20000);
