import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsAnimation2 } from "./BenefitsAnimation2";

describe("BenefitsAnimation2", () => {
  it("tells one illustrative issue's story through team approval and merge", () => {
    const html = renderToStaticMarkup(<BenefitsAnimation2 />);
    expect(html).toContain('data-benefits-animation="two"');
    expect(html).toContain("Handle late arriving events");
    expect(html).toContain("Regression tests added");
    expect(html).not.toMatch(/\bAI\b/);
    expect(html).not.toContain("AI-assisted");
    expect(html).toContain("Weekly sync · 30 min · Optional");
    expect(html).not.toContain("Illustrative workflow");
    expect([...html.matchAll(/data-activity="\d"/g)]).toHaveLength(8);
    expect(html).toContain("data-call-room");
    expect(html).not.toContain("data-artifact-kind");
    expect(html).not.toContain("<dl");
    expect(html).not.toContain("<dt");
    const messages = [
      ...html.matchAll(/<p[^>]*data-message[^>]*>([^<]+)<\/p>/g),
    ];
    expect(messages).toHaveLength(7);
    for (const message of messages) {
      const words = message[1].split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(20);
      expect(words).toBeLessThanOrEqual(45);
    }
    expect([...html.matchAll(/<ul\b/g)]).toHaveLength(4);
    const bullets = [
      ...html.matchAll(/<li[^>]*data-reveal[^>]*>([^<]+)<\/li>/g),
    ];
    expect(bullets).toHaveLength(8);
    for (const bullet of bullets)
      expect(bullet[1].split(/\s+/).length).toBeGreaterThanOrEqual(7);
    expect(html).toContain("after the earlier window state has been cleared.");
    expect(html).toContain("advances the watermark past window expiry.");
    expect(html).toContain(
      "Could we use our existing allowed lateness setting",
    );
    expect(html).toContain("fails without the fix and passes with it.");
    expect(html).toContain("go to a side output so we can recover them.");
    expect(html).toContain("Roughly how many events would we need to replay?");
    expect(html).toContain("Replay tests also cover duplicate writes.");
    expect(html).toContain("the replay limits and checks for duplicate writes");
    expect([...html.matchAll(/>Day [123]</g)]).toHaveLength(8);
    expect(html.indexOf("Changes requested")).toBeLessThan(
      html.indexOf("Review comment resolved"),
    );
    expect(html.indexOf("Approved by your team")).toBeLessThan(
      html.indexOf("PR #1979 merged"),
    );
  });

  it("keeps the compact decorative thread free of controls and footer chrome", () => {
    const html = renderToStaticMarkup(<BenefitsAnimation2 />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("prFooter");
    expect(html).not.toContain("workspace");
    expect(html).not.toContain("aria-live=");
    expect(html).not.toContain("<a ");
  });
});
