import { describe, expect, it } from "vitest";
import { belongsToAppInstance, parseAppInstance } from "./instance";

describe("app instance", () => {
  it.each([
    "sample",
    "a",
    "customer-website",
    "a".repeat(20),
  ])("accepts caller configuration without repository or environment policy: %s", (appInstance) => {
    expect(parseAppInstance(appInstance)).toBe(appInstance);
    expect(
      belongsToAppInstance(appInstance, `${appInstance}-${"a".repeat(32)}`),
    ).toBe(true);
  });
  it.each([
    undefined,
    "",
    "UPPER",
    "../other",
    "-sample",
    "sample-",
    "1sample",
    "a".repeat(21),
  ])("rejects an invalid app instance: %s", (appInstance) => {
    expect(() => parseAppInstance(appInstance)).toThrow();
  });
  it.each([
    undefined,
    "sample",
    `samplex-${"a".repeat(32)}`,
    `other-${"a".repeat(32)}`,
    `sample-${"A".repeat(32)}`,
    `sample-${"a".repeat(31)}`,
  ])("rejects an unowned or malformed operation ID: %s", (operationId) => {
    expect(belongsToAppInstance("sample", operationId)).toBe(false);
  });
});
