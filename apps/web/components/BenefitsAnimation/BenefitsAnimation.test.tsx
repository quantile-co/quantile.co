import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// biome-ignore lint/style/noRestrictedImports: Copy regression tests cover standalone illustrations without coupling their implementations.
import { HeroAnimation } from "../HeroAnimation/HeroAnimation";
import { BenefitsAnimation1 } from "./BenefitsAnimation1";
import { BenefitsAnimation2 } from "./BenefitsAnimation2";
import { BenefitsAnimation3 } from "./BenefitsAnimation3";

describe("Illustration copy", () => {
  it("keeps the title of issue #1941 consistent across animations", () => {
    for (const Animation of [
      HeroAnimation,
      BenefitsAnimation1,
      BenefitsAnimation2,
    ]) {
      expect(renderToStaticMarkup(<Animation />)).toContain(
        ">Handle late arriving events<",
      );
    }
  });

  it.each([
    ["hero", HeroAnimation],
    ["onboarding", BenefitsAnimation1],
    ["conversation", BenefitsAnimation2],
    ["capacity", BenefitsAnimation3],
  ] as const)("uses no em dashes in the %s animation", (_, Animation) => {
    const text = renderToStaticMarkup(<Animation />).replace(/<[^>]*>/g, "");
    expect(text).not.toContain("—");
  });
});
