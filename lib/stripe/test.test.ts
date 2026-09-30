import { describe, expect, it } from "vitest";
import { assertTestOwnership, createTestOperation } from "./test";

describe("integration test isolation", () => {
  it("uses distinct operation IDs within one app instance", () => {
    const operations = Array.from({ length: 3 }, () =>
      createTestOperation("sample", "delivered"),
    );
    expect(new Set(operations.map((operation) => operation.id)).size).toBe(3);
    expect(
      new Set(operations.map((operation) => operation.recipient)).size,
    ).toBe(3);
    for (const operation of operations) {
      expect(operation.id).toMatch(/^sample-[a-f0-9]{32}$/);
      expect(operation.recipient).toBe(`delivered+${operation.id}@resend.dev`);
      expect(operation.metadata.quantile_app_instance).toBe("sample");
      expect(() =>
        assertTestOwnership(
          { livemode: false, metadata: operation.metadata },
          operation,
        ),
      ).not.toThrow();
    }
  });
  it.each([
    "",
    "../other",
    "UPPERCASE",
    "a".repeat(21),
  ])("rejects invalid app instance %s", (appInstance) => {
    expect(() => createTestOperation(appInstance, "delivered")).toThrow();
  });
  it("refuses live objects and other operations even within the same app instance", () => {
    const operation = createTestOperation("sample", "delivered");
    const other = createTestOperation("sample", "delivered");
    const otherApp = createTestOperation("other", "delivered");
    for (const object of [
      { livemode: true, metadata: operation.metadata },
      { livemode: false, metadata: other.metadata },
      { livemode: false, metadata: otherApp.metadata },
      { livemode: false, metadata: { quantile_test_id: operation.id } },
      { livemode: false, metadata: null },
    ])
      expect(() => assertTestOwnership(object, operation)).toThrow();
  });
});
