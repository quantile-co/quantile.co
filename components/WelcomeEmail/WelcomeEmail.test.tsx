import { render, toPlainText } from "react-email";
import { describe, expect, it } from "vitest";
import { WelcomeEmail } from "./WelcomeEmail";

describe("WelcomeEmail", () => {
  it.each([
    1, 2, 3, 4, 5,
  ])("renders capacity %i as HTML and plain text", async (quantity) => {
    const html = await render(<WelcomeEmail quantity={quantity} />);
    const text = toPlainText(html);
    expect(html).toContain("Welcome to Quantile");
    expect(text.replace(/\s+/g, " ")).toContain(
      `${quantity} concurrent in-progress ${quantity === 1 ? "issue." : "issues."}`,
    );
    expect(text).toContain("not a monthly limit");
    expect(text).toContain("repository and issue-tracker links");
    expect(html).not.toMatch(/<script|<form|<input/i);
  });

  it.each([
    0,
    6,
    -1,
    1.5,
    Number.NaN,
  ])("rejects invalid capacity %s", async (quantity) => {
    await expect(render(<WelcomeEmail quantity={quantity} />)).rejects.toThrow(
      "Capacity must be an integer from 1 to 5.",
    );
  });
});
