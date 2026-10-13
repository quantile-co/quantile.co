import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsAnimationTwo } from "./BenefitsAnimationTwo";

describe("BenefitsAnimationTwo", () => {
  it("tells one illustrative issue's story through team approval and merge", () => {
    const html = renderToStaticMarkup(<BenefitsAnimationTwo />);
    expect(html).toContain('data-benefits-animation="two"');
    expect(html).toContain("Handle late-arriving events");
    expect(html).toContain("AI-assisted regression tests");
    expect(html).toContain("Weekly sync · 30 min · Optional");
    expect(html).not.toContain("Illustrative workflow");
    expect([...html.matchAll(/data-activity="\d"/g)]).toHaveLength(8);
    expect(html).toContain("data-call-room");
    expect([...html.matchAll(/data-artifact-kind="[a-z]+"/g)]).toHaveLength(7);
    for (const kind of [
      "tests",
      "review",
      "config",
      "sync",
      "replay",
      "checks",
      "merged",
    ]) {
      expect(html).toContain(`data-artifact-kind="${kind}"`);
    }
    expect([...html.matchAll(/<dt>/g)]).toHaveLength(21);
    expect(html).toContain("Your retention policy.");
    expect(html).toContain("Recovery runbook in the PR.");
    expect([...html.matchAll(/>Day [123]</g)]).toHaveLength(8);
    expect(html.indexOf("Changes requested")).toBeLessThan(
      html.indexOf("Review comment resolved"),
    );
    expect(html.indexOf("Approved by your team")).toBeLessThan(
      html.indexOf("PR #1979 merged"),
    );
  });

  it("keeps the compact decorative thread free of controls and footer chrome", () => {
    const html = renderToStaticMarkup(<BenefitsAnimationTwo />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("prFooter");
    expect(html).not.toContain("workspace");
    expect(html).not.toContain("aria-live=");
    expect(html).not.toContain("<a ");
  });
});
