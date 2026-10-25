import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsAnimation3 } from "./BenefitsAnimation3";

describe("BenefitsAnimation3", () => {
  it("renders a decorative step chart, not a billing dashboard", () => {
    const html = renderToStaticMarkup(<BenefitsAnimation3 />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-benefits-animation="three"');
    for (const text of [
      "Month",
      "$4,995",
      "$9,990",
      "1 concurrent issue",
      "2 concurrent issues",
      "3 concurrent issues",
      "$4,995 billed",
      "at period start",
      "Subscription",
      "paused",
      "25% of period left",
      "+$2,497.50 prorated",
      "$9,990 billed",
      "renewal",
      "Time banked",
      "banked",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(
      /Time →|↑|data-period-boundary|data-axis-issues|data-axis-price|data-axis-extension/,
    );
    for (const month of [1, 2, 3, 4])
      expect(html).toContain(`data-axis-month="${month}"`);
    expect(html.match(/at period start/g)).toHaveLength(3);
    expect(html).not.toContain("renewed");
    expect(html).toContain("data-rate-line");
    expect(html).toContain("data-pause-mark");
    expect(html).not.toMatch(/<(form|input|button|a|p)\b/);
    expect(html).not.toMatch(/Backlog|In progress|Done|data-issue|stripe\.com/);
  });

  it("gives each instance a unique reveal mask", () => {
    const html = renderToStaticMarkup(
      <>
        <BenefitsAnimation3 />
        <BenefitsAnimation3 />
      </>,
    );
    const ids = [...html.matchAll(/<mask id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(html).toContain(`mask="url(#${id})"`);
  });
});
