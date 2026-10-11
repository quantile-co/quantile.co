import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FaqSection } from "./FaqSection";

const liveLoginUrl =
  "https://billing.stripe.com/p/login/bJeeVe3TIaVO9ODfkn6AM00";

describe("FAQ billing portal links", () => {
  it("links capacity and cancellation answers to the shareable live portal login", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <FaqSection
          billingPortalLoginUrl={liveLoginUrl}
          signUpFormId="subscribe"
        />
      </MantineProvider>,
    );

    expect(html.match(new RegExp(`href="${liveLoginUrl}"`, "g"))).toHaveLength(
      2,
    );
    expect(html).toContain("How do I scale up or down?");
    expect(html).toContain("How do I pause or cancel?");
    expect(html).not.toContain("through Stripe");
    expect(html).not.toContain("/p/session/");
  });
});
