import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WelcomePage, { metadata } from "./page";

async function render(sandbox?: string | string[]) {
  return renderToStaticMarkup(
    await WelcomePage({ searchParams: Promise.resolve({ sandbox }) }),
  );
}

describe("Welcome return page", () => {
  it("does not imply a redirect proves payment or email fulfillment", async () => {
    const html = await render();
    expect(html).toContain("Thanks for subscribing.");
    expect(html).toContain("We’re confirming your payment.");
    expect(html).toContain("Once it’s confirmed");
    expect(html).not.toContain("Sandbox purchase");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("explains why Sandbox purchases do not send to the buyer's inbox", async () => {
    const html = await render("1");
    expect(html).toContain("Sandbox purchase");
    expect(html).toContain("Resend’s simulator");
    expect(html).toContain("not the address entered at Checkout");
    expect(await render(["1", "1"])).not.toContain("Sandbox purchase");
  });
});
