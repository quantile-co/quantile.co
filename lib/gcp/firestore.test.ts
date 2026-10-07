import { describe, expect, it } from "vitest";
import { getFirestore, validateFirestoreConfig } from "./firestore";

describe("Firestore target configuration", () => {
  it.each([
    "",
    "https://evil.example",
    "../project",
  ])("rejects invalid project %s", (projectId) => {
    expect(() => validateFirestoreConfig({ projectId })).toThrow();
  });
  it.each([
    "evil.example:8080",
    "127.0.0.1:0",
    "localhost:65536",
    "https://localhost:8080",
  ])("rejects unsafe emulator %s", (emulatorHost) => {
    expect(() =>
      validateFirestoreConfig({ projectId: "demo-quantile", emulatorHost }),
    ).toThrow();
  });
  it("accepts loopback IPv6 without depending on billing configuration", () => {
    expect(
      validateFirestoreConfig({
        projectId: "demo-quantile",
        emulatorHost: "[::1]:8080",
      }),
    ).toEqual({ projectId: "demo-quantile", emulatorHost: "[::1]:8080" });
  });
  it("reuses a lazy client for the same database without creating resources", () => {
    const config = {
      projectId: "demo-quantile",
      emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    };
    const first = getFirestore(config);
    expect(getFirestore({ ...config })).toBe(first);
    expect(first.doc("probe/identity").path).toBe("probe/identity");
    expect(first.databaseId).toBe("(default)");
  });
});
