import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertRecord, createWelcomeDelivery, type Mail } from "./delivery";
import { createWelcomeReceiptHandler } from "./receipt";
import { memoryStore, pending, receipt } from "./test";

beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));
describe("immutable request and completion contract", () => {
  function setup() {
    const store = memoryStore();
    const record = pending();
    const render = vi.fn(async () => JSON.parse(record.request) as Mail);
    const send = vi.fn<(request: string, key: string) => Promise<string>>(
      async () => "mail_accepted",
    );
    const deliver = createWelcomeDelivery({ store, send });
    const callback = createWelcomeReceiptHandler({
      config: { mode: "test", appInstance: record.appInstance },
      getStore: () => store,
    });
    return { store, record, render, send, deliver, callback };
  }
  it("stores the request before any external send", async () => {
    const { deliver, record, render, send, store } = setup();
    send.mockImplementation(async () => {
      expect(await store.get(record)).toMatchObject({ state: "pending" });
      return "mail_accepted";
    });
    expect(await deliver(record, render)).toMatchObject({
      state: "accepted",
      resendId: "mail_accepted",
    });
  });
  it("does not send if preparation fails", async () => {
    const { deliver, record, render, send, store } = setup();
    store.prepare.mockRejectedValueOnce(new Error("unavailable"));
    await expect(deliver(record, render)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it("reuses the exact request after an ambiguous send and a deployment change", async () => {
    const { deliver, record, render, send, store } = setup();
    send.mockRejectedValueOnce(new Error("timeout after acceptance"));
    await expect(deliver(record, render)).rejects.toThrow();
    const prepared = await store.get(record);
    expect.assert(prepared);
    const original = prepared.request;
    render.mockImplementation(async () => {
      throw new Error("new renderer broken");
    });
    expect((await deliver(record, render)).state).toBe("accepted");
    expect(send.mock.calls.map((args) => args[0])).toEqual([
      original,
      original,
    ]);
    expect(render).toHaveBeenCalledOnce();
  });
  it("waits for durable receipt, not just the provider response", async () => {
    const { deliver, record, render, store } = setup();
    const accept = store.accept.getMockImplementation();
    expect.assert(accept);
    let release = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    store.accept.mockImplementation(async (...args) => {
      await barrier;
      return accept(...args);
    });
    let done = false;
    const result = deliver(record, render).then((value) => {
      done = true;
      return value;
    });
    await vi.waitFor(() => expect(store.accept).toHaveBeenCalled());
    expect(done).toBe(false);
    release();
    expect((await result).state).toBe("accepted");
  });
  it("lets a verified callback reconcile an accepted send with a lost response", async () => {
    const { deliver, record, render, send, store, callback } = setup();
    send.mockRejectedValueOnce(new Error("lost response"));
    await expect(deliver(record, render)).rejects.toThrow();
    const prepared = await store.get(record);
    expect.assert(prepared);
    await callback(receipt(prepared));
    expect((await deliver(record, render)).callbackReceivedAt).toBeTruthy();
    expect(send).toHaveBeenCalledOnce();
  });
  it("keeps the winning complete payload under concurrent renderers", async () => {
    const { deliver, record, render, send } = setup();
    await Promise.all([
      deliver(record, render),
      deliver(record, async () => ({
        ...(await render()),
        subject: "another release",
      })),
    ]);
    expect(new Set(send.mock.calls.map((args) => args[0])).size).toBe(1);
    expect(
      send.mock.calls.every((args) => args[1] === record.idempotencyKey),
    ).toBe(true);
  });
  it("does not resend a completed record, even after the provider idempotency window", async () => {
    const { store, record, deliver, render, send } = setup();
    await store.prepare({ ...record, createdAt: "2020-01-01T00:00:00.000Z" });
    await store.accept(record, "mail_accepted");
    await deliver(record, render);
    expect(send).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
  it("rejects another instance's record", async () => {
    const { deliver, record, render, send, store } = setup();
    store.get.mockResolvedValueOnce(
      pending({ appInstance: "other", testId: `other-${"a".repeat(32)}` }),
    );
    await expect(deliver(record, render)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects schema changes and real recipients in test records", () => {
    expect(() => assertRecord({ ...pending(), schema: "2" as "1" })).toThrow();
    expect(() =>
      assertRecord(pending({}, { to: ["customer@example.com"] })),
    ).toThrow();
  });
  it("ignores unrelated callbacks without opening the store", async () => {
    const getStore = vi.fn();
    const callback = createWelcomeReceiptHandler({
      config: { mode: "test", appInstance: "sample" },
      getStore,
    });
    const event = receipt();
    event.data.tags.quantile_app_instance = "other";
    expect(await callback(event)).toEqual({ result: "ignored" });
    expect(await callback({ type: "email.delivered" })).toEqual({
      result: "ignored",
    });
    expect(getStore).not.toHaveBeenCalled();
  });
  it("never creates a missing request from a callback", async () => {
    const { callback, store } = setup();
    await expect(callback(receipt())).rejects.toThrow("not found");
    expect(store.prepare).not.toHaveBeenCalled();
  });
  it("rejects mismatched recipients and conflicting receipt IDs", async () => {
    const { callback, store, record } = setup();
    await store.prepare(record);
    const event = receipt(record);
    event.data.to = ["other@example.com"];
    await expect(callback(event)).rejects.toThrow("does not match");
    await callback(receipt(record));
    await expect(callback(receipt(record, "another_email"))).rejects.toThrow(
      "Conflicting",
    );
  });
});
