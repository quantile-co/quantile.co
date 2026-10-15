import { describe, expect, it } from "vitest";
import { readFirestoreTarget } from "../env/env";
import { getFirestore } from "./firestore";

describe("Firestore client factory", () => {
  it("reuses a client for equivalent resolved settings", () => {
    const settings = readFirestoreTarget(
      {
        GCP_PROJECT_ID: "demo-quantile",
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
      },
      "development",
    );
    const first = getFirestore(settings);
    expect(getFirestore({ ...settings })).toBe(first);
    expect(first.doc("probe/identity").path).toBe("probe/identity");
    expect(first.databaseId).toBe("(default)");
  });
  it("separates clients with different resolved connection settings", () => {
    const settings = readFirestoreTarget(
      {
        GCP_PROJECT_ID: "demo-quantile",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      },
      "development",
    );
    expect(getFirestore(settings)).not.toBe(
      getFirestore({ ...settings, host: "127.0.0.1:8081" }),
    );
  });
});
