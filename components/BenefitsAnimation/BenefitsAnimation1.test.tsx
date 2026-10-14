import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsAnimation1 } from "./BenefitsAnimation1";

describe("BenefitsAnimation1", () => {
  it("renders three distinct onboarding actions and a completed static backlog", () => {
    const html = renderToStaticMarkup(<BenefitsAnimation1 />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-benefits-animation="one"');
    for (const panel of ["checkout", "access", "backlog"]) {
      expect(html).toContain(`data-panel="${panel}"`);
    }
    for (const text of [
      "Stripe",
      "Concurrent issues",
      "Expiry",
      "CVV",
      "•••• •••• •••• ••••",
      "Subscribe",
      "Cardholder",
      "•••••• ••••••••",
      "•• / ••",
      "GitHub",
      "Linear",
      "Slack",
      "Cloud",
      "Handle late arriving events",
      "#1941",
      "1 in progress",
      "In progress",
    ]) {
      expect(html).toContain(text);
    }
    expect([
      ...html.matchAll(/data-fill="(?:holder|number|expiry|cvv)"/g),
    ]).toHaveLength(4);
    expect(html).toContain("data-quantity-zero");
    expect(html).toContain("data-quantity-one");
    expect([...html.matchAll(/data-issue="\d"/g)]).toHaveLength(3);
    expect([...html.matchAll(/data-connection="\d"/g)]).toHaveLength(4);
    expect(html).not.toContain('data-panel="email"');
    expect(html).not.toContain("data-animated");
  });

  it("gives each instance its own SVG masks", () => {
    const html = renderToStaticMarkup(
      <>
        <BenefitsAnimation1 />
        <BenefitsAnimation1 />
      </>,
    );
    const ids = [...html.matchAll(/<mask id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
  });

  it("has no real checkout, comment feed, promotional header, or playback chrome", () => {
    const html = renderToStaticMarkup(<BenefitsAnimation1 />);
    expect(html).not.toMatch(/<(form|input|a|button)\b/);
    expect(html).not.toContain("Your team, ready to build");
    expect(html).not.toContain("data-activity");
    expect(html).not.toContain("data-position");
    expect(html).not.toContain("data-thread-viewport");
  });
});
