import "@fontsource-variable/outfit";
import "@/app/globals.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { BenefitsSection } from "@/components/BenefitsSection/BenefitsSection";
import { FaqSection } from "@/components/FaqSection/FaqSection";
import { PricingSection } from "@/components/PricingSection/PricingSection";
import { theme } from "./theme";

function PreviewCheckoutForm({ children }: { children: ReactNode }) {
  return <form action="/storybook-checkout-preview">{children}</form>;
}

const initialViewport = {
  width: window.innerWidth,
  height: window.innerHeight,
};

afterEach(async () => {
  await page.viewport(initialViewport.width, initialViewport.height);
});

describe("homepage navigation anchors", () => {
  it("places Benefits, Pricing, and FAQ at the same distance below the header", async () => {
    await page.viewport(1200, 900);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      root.render(
        <MantineProvider theme={theme}>
          <div style={{ height: "100vh" }} />
          <BenefitsSection CheckoutForm={PreviewCheckoutForm} />
          <PricingSection CheckoutForm={PreviewCheckoutForm} />
          <FaqSection
            billingPortalLoginUrl="/portal-preview"
            CheckoutForm={PreviewCheckoutForm}
          />
          <div style={{ height: "100vh" }} />
        </MantineProvider>,
      );
      await vi.waitFor(() =>
        expect(container.querySelector("#faq")).not.toBeNull(),
      );
      await document.fonts.ready;

      const anchorTops = [];
      for (const id of ["benefits", "pricing", "faq"]) {
        const anchor = container.querySelector<HTMLElement>(`#${id}`);
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
      root.unmount();
      container.remove();
      window.scrollTo(0, 0);
    }
  });
});
