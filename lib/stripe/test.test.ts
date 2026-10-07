import { describe, expect, it } from "vitest";
import {
  assertEligibleTestPrice,
  assertTestOwnership,
  createTestOperation,
} from "./test";

describe("integration test isolation", () => {
  it("accepts Q1 or developer-owned paid monthly test prices", () => {
    const price = {
      active: true,
      livemode: false,
      currency: "usd",
      unit_amount: 499500,
      recurring: { interval: "month", usage_type: "licensed" },
    };
    expect(() => assertEligibleTestPrice(price)).not.toThrow();
    expect(() =>
      assertEligibleTestPrice({ ...price, unit_amount: 100 }),
    ).not.toThrow();
    for (const invalid of [
      { ...price, active: false },
      { ...price, livemode: true },
      { ...price, currency: "eur" },
      { ...price, unit_amount: 0 },
      { ...price, unit_amount: null },
      { ...price, recurring: null },
      { ...price, recurring: { interval: "year", usage_type: "licensed" } },
      { ...price, recurring: { interval: "month", usage_type: "metered" } },
    ])
      expect(() => assertEligibleTestPrice(invalid)).toThrow();
  });

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
