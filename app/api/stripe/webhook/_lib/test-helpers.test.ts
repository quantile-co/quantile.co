import { describe, expect, it } from "vitest";
import { assertTestOwnership, createTestRun } from "./test-helpers";

describe("connected test isolation", () => {
  it("gives simultaneous local and CI runs separate identities within a PR", () => {
    const runs = [
      createTestRun("pr-42", "preview", "delivered"),
      createTestRun("pr-42", "preview", "delivered"),
      createTestRun("pr-42", `local-${"a".repeat(32)}`, "bounced"),
    ];
    expect(new Set(runs.map((run) => run.id)).size).toBe(3);
    expect(new Set(runs.map((run) => run.recipient)).size).toBe(3);
    for (const run of runs) {
      expect(run.recipient).toMatch(
        /^(delivered|bounced)\+pr-42-[a-f0-9]{32}@resend\.dev$/,
      );
      expect(() =>
        assertTestOwnership({ livemode: false, metadata: run.metadata }, run),
      ).not.toThrow();
    }
  });
  it.each([
    "",
    "main",
    "preview",
    "developer",
    "pr-0",
    "pr-../1",
  ])("requires a PR, not an arbitrary shared namespace: %s", (scope) => {
    expect(() => createTestRun(scope, "preview", "delivered")).toThrow();
  });
  it("refuses cleanup of live objects and resources belonging to other runs", () => {
    const run = createTestRun("pr-42", "preview", "delivered");
    const other = createTestRun("pr-42", "preview", "delivered");
    for (const object of [
      { livemode: true, metadata: run.metadata },
      { livemode: false, metadata: other.metadata },
      {
        livemode: false,
        metadata: { ...run.metadata, quantile_test_scope: "pr-43" },
      },
      {
        livemode: false,
        metadata: {
          ...run.metadata,
          quantile_test_target: "another-developer",
        },
      },
      { livemode: false, metadata: null },
    ])
      expect(() => assertTestOwnership(object, run)).toThrow();
  });
});
