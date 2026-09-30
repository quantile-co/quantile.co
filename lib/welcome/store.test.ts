import { randomUUID } from "node:crypto";
import type { DocumentReference } from "@google-cloud/firestore";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getFirestore } from "@/lib/gcp/firestore";
import { createWelcomeStore } from "./store";
import { memoryStore, pending } from "./test";

afterEach(() => vi.useRealTimers());

describe("SDK persistence failures", () => {
  function stub() {
    const doc = { get: vi.fn(), create: vi.fn(), update: vi.fn() };
    const store = createWelcomeStore({
      doc: () => doc as unknown as DocumentReference,
    });
    return { doc, store };
  }
  it("sanitizes SDK errors", async () => {
    const { doc, store } = stub();
    doc.get.mockRejectedValue(new Error("authorization: private"));
    await expect(store.get(pending())).rejects.toThrow(
      "Could not read welcome record.",
    );
    doc.create.mockRejectedValue(new Error("private"));
    await expect(store.prepare(pending())).rejects.toThrow(
      "Could not prepare welcome record.",
    );
  });
  it("bounds ambiguous writes without treating a timeout as nonacceptance", async () => {
    vi.useFakeTimers();
    const { doc, store } = stub();
    doc.create.mockReturnValue(new Promise(() => {}));
    const result = expect(store.prepare(pending())).rejects.toThrow(
      "Could not prepare welcome record.",
    );
    await vi.advanceTimersByTimeAsync(3000);
    await result;
    expect(doc.get).not.toHaveBeenCalled();
  });
  it("does not report completion without durable read-back", async () => {
    const { doc, store } = stub();
    doc.get.mockResolvedValue({
      exists: true,
      data: () => pending(),
      updateTime: {},
    });
    doc.update.mockResolvedValue({});
    await expect(store.accept(pending(), "mail_accepted")).rejects.toThrow(
      "Welcome receipt was not confirmed.",
    );
    expect(doc.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: "accepted", resendId: "mail_accepted" }),
      { lastUpdateTime: {} },
    );
  });
});

describe("official Firestore emulator: atomic persistence", () => {
  function setup() {
    if (
      !process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.GCP_PROJECT_ID !== "demo-quantile"
    )
      throw new Error(
        "Run pnpm test; these tests require its demo Firestore emulator.",
      );
    const client = getFirestore({
      projectId: "demo-quantile",
      emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    });
    return {
      client,
      store: createWelcomeStore(client),
      record: pending({
        subscriptionId: `sub_${randomUUID().replaceAll("-", "")}`,
      }),
    };
  }
  beforeAll(async () => {
    // Initialize the cold SDK/emulator data path separately from the store's
    // production deadline. A listening emulator port does not establish this.
    const { client } = setup();
    const probe = client.doc(`test-probes/store-${randomUUID()}`);
    try {
      await probe.create({ ready: true });
      expect((await probe.get()).data()).toEqual({ ready: true });
    } finally {
      await probe.delete();
    }
  }, 15_000);

  describe.each([
    "memory",
    "Firestore SDK",
  ])("shared persistence contract: %s", (implementation) => {
    function contract() {
      return {
        store: implementation === "memory" ? memoryStore() : setup().store,
        record: pending({
          subscriptionId: `sub_${randomUUID().replaceAll("-", "")}`,
        }),
      };
    }
    it("keeps the first request and rejects another operation", async () => {
      const { store, record } = contract();
      await store.prepare(record);
      expect(
        (
          await store.prepare({
            ...record,
            request: record.request.replace("Welcome to Quantile", "New copy"),
          })
        ).request,
      ).toBe(record.request);
      await expect(
        store.prepare({ ...record, invoiceId: "in_another" }),
      ).rejects.toThrow();
      expect((await store.get(record))?.request).toBe(record.request);
    });
    it("requires preparation and preserves the first accepted ID", async () => {
      const { store, record } = contract();
      await expect(store.accept(record, "mail_first")).rejects.toThrow();
      await store.prepare(record);
      const accepted = await store.accept(record, "mail_first");
      expect(accepted.state).toBe("accepted");
      await expect(store.accept(record, "mail_other")).rejects.toThrow();
      await expect(store.prepare(accepted)).rejects.toThrow("pending");
      expect((await store.get(record))?.resendId).toBe("mail_first");
    });
    it("adds callback evidence without replacing either timestamp on replay", async () => {
      const { store, record } = contract();
      await store.prepare(record);
      const accepted = await store.accept(record, "mail_first");
      const callback = await store.accept(record, "mail_first", "webhook");
      expect(callback.acceptedAt).toBe(accepted.acceptedAt);
      expect(callback.callbackReceivedAt).toBeTruthy();
      expect(await store.accept(record, "mail_first", "webhook")).toEqual(
        callback,
      );
      expect(callback.request).toBe(record.request);
    });
  });

  it("atomically chooses one immutable payload under concurrent creation", async () => {
    const { store, record } = setup();
    const second = {
      ...record,
      request: record.request.replace(
        "Welcome to Quantile",
        "Another deployment",
      ),
    };
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        store.prepare(i % 2 ? record : second),
      ),
    );
    // The SDK retries emulator ABORTED contention. A loser can exceed the
    // production deadline under load; retry must converge, never replace data.
    expect(attempts.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of attempts) {
      if (result.status === "rejected")
        expect(result.reason.message).toBe("Could not prepare welcome record.");
    }
    const saved = await store.get(record);
    expect(saved?.request).toBeOneOf([record.request, second.request]);
    const winners = await Promise.all([
      store.prepare(record),
      store.prepare(second),
    ]);
    expect(winners.every((winner) => winner.request === saved?.request)).toBe(
      true,
    );
  });
  it("converges identical concurrent acceptance and preserves immutable fields", async () => {
    const { store, record } = setup();
    await store.prepare(record);
    const saved = await Promise.all([
      store.accept(record, "mail_accepted"),
      store.accept(record, "mail_accepted"),
    ]);
    expect(saved.every((r) => r.state === "accepted")).toBe(true);
    expect((await store.get(record))?.request).toBe(record.request);
    const callback = await store.accept(record, "mail_accepted", "webhook");
    expect(callback.callbackReceivedAt).toBeTruthy();
    expect(callback.acceptedAt).toBe(saved[0].acceptedAt);
  });
  it("preserves the first receipt when conflicting IDs race", async () => {
    const { store, record } = setup();
    await store.prepare(record);
    const results = await Promise.allSettled([
      store.accept(record, "mail_first"),
      store.accept(record, "mail_second"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const accepted = await store.get(record);
    expect(accepted?.resendId).toMatch(/^mail_(first|second)$/);
    const other =
      accepted?.resendId === "mail_first" ? "mail_second" : "mail_first";
    await expect(store.accept(record, other)).rejects.toThrow("Conflicting");
  });
  it("reconciles API/callback races with callback retry when necessary", async () => {
    const { store, record } = setup();
    await store.prepare(record);
    await Promise.allSettled([
      store.accept(record, "mail_same"),
      store.accept(record, "mail_same", "webhook"),
    ]);
    const result = await store.accept(record, "mail_same", "webhook");
    expect(result.callbackReceivedAt).toBeTruthy();
    expect(result.resendId).toBe("mail_same");
    expect(result.request).toBe(record.request);
  });
  it("cannot overwrite another operation or invent a missing request", async () => {
    const { store, record } = setup();
    await expect(store.accept(record, "mail_missing")).rejects.toThrow(
      "not found",
    );
    await store.prepare(record);
    await expect(
      store.prepare(
        pending({
          subscriptionId: record.subscriptionId,
          appInstance: "other",
          testId: `other-${"a".repeat(32)}`,
        }),
      ),
    ).rejects.toThrow("different operation");
    await expect(
      store.accept({ ...record, invoiceId: "in_other" }, "mail_bad"),
    ).rejects.toThrow("different operation");
  });
  it("rejects corrupt stored data rather than trusting SDK types", async () => {
    const { client, store, record } = setup();
    await client
      .doc(`welcome-emails/test-${record.subscriptionId}`)
      .create({ schema: "invalid" });
    await expect(store.get(record)).rejects.toThrow("Invalid welcome record");
  });
});
