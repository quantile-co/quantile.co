import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireOwner,
  assertOwner,
  cleanupOwner,
  localAppInstance,
  type ResendRegistry,
  readOwner,
  saveOwner,
} from "./ownership.ts";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "quantile-lifecycle-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
const registry = (): ResendRegistry => ({
  find: vi.fn(async () => []),
  get: vi.fn(async () => null),
  remove: vi.fn(async () => {}),
});
async function ownedEndpoint() {
  const owner = await acquireOwner(root, "sample");
  owner.endpoint = `https://sample.example.com/api/resend/webhook/${owner.token}`;
  await saveOwner(root, owner);
  return owner;
}

describe("app identity and internal integration ownership", () => {
  it("persists one instance per checkout without credentials", async () => {
    const instance = await localAppInstance(root);
    expect(instance).toMatch(/^app-[a-f0-9]{16}$/);
    expect(await localAppInstance(root)).toBe(instance);
    expect(await localAppInstance(path.join(root, "worktree"))).not.toBe(
      instance,
    );
    expect(await localAppInstance(root, "explicit")).toBe("explicit");
  });
  it("publishes one complete identity under concurrent startup", async () => {
    const values = await Promise.all(
      Array.from({ length: 32 }, () => localAppInstance(root)),
    );
    expect(new Set(values).size).toBe(1);
    expect(await readdir(path.join(root, ".quantile"))).toEqual([
      "app-instance",
    ]);
  });
  it("admits one concurrent integration lifecycle with an internal token", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 16 }, () => acquireOwner(root, "sample")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(15);
    const owner = await readOwner(root);
    expect(owner).toMatchObject({ appInstance: "sample", version: 2 });
    expect(owner.token).toMatch(/^sample-[a-f0-9]{32}$/);
    expect(await readdir(path.join(root, ".quantile"))).toEqual([
      "webhooks.json",
    ]);
  });
  it("sanitizes malformed journals and refuses old/unknown formats", async () => {
    const owner = await acquireOwner(root, "sample");
    await writeFile(
      path.join(root, ".quantile/webhooks.json"),
      '{"credential":"re_do_not_echo", invalid',
    );
    await expect(readOwner(root)).rejects.toThrow(
      "Invalid integration ownership record",
    );
    expect(() => assertOwner({ ...owner, version: 1 as 2 })).toThrow();
  });
  it("cleans exact registrations after a crash before ID capture", async () => {
    const owner = await ownedEndpoint();
    const api = registry();
    vi.mocked(api.find).mockResolvedValue([
      { id: "owned", endpoint: owner.endpoint ?? "", events: ["email.sent"] },
    ]);
    await cleanupOwner(root, owner, api);
    expect(api.find).toHaveBeenCalledWith(owner.endpoint);
    expect(api.remove).toHaveBeenCalledExactlyOnceWith("owned");
    await expect(readOwner(root)).rejects.toThrow();
  });
  it("serializes cleanup and removes the overlay before allowing a replacement", async () => {
    const owner = await ownedEndpoint();
    owner.resendId = "owned";
    await saveOwner(root, owner);
    await writeFile(path.join(root, ".quantile/ngrok.yml"), "old overlay");
    const api = registry();
    const gate = Promise.withResolvers<null>();
    vi.mocked(api.get).mockReturnValueOnce(gate.promise);
    const cleanup = cleanupOwner(root, owner, api);
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledOnce());
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "cleanup is active",
    );
    await expect(acquireOwner(root, "sample")).rejects.toThrow(
      "cleanup is active",
    );
    gate.resolve(null);
    await cleanup;
    await expect(
      access(path.join(root, ".quantile/ngrok.yml")),
    ).rejects.toThrow();
    const next = await acquireOwner(root, "sample");
    expect(next.token).not.toBe(owner.token);
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "another integration lifecycle",
    );
    expect(await readOwner(root)).toEqual(next);
  });
  it("fails closed on an interrupted cleanup guard", async () => {
    const owner = await acquireOwner(root, "sample");
    await mkdir(path.join(root, ".quantile/webhooks-cleanup"));
    const api = registry();
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "was interrupted",
    );
    await expect(acquireOwner(root, "sample")).rejects.toThrow(
      "was interrupted",
    );
    expect(await readOwner(root)).toEqual(owner);
    expect(api.find).not.toHaveBeenCalled();
  });
  it("refuses cleanup of another live process or host", async () => {
    const owner = await acquireOwner(root, "sample");
    owner.pid = process.ppid;
    await saveOwner(root, owner);
    const api = registry();
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow();
    owner.host = "another-host";
    await saveOwner(root, owner);
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow();
    expect(api.find).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });
  it("validates all candidates before deleting any", async () => {
    const owner = await ownedEndpoint();
    const api = registry();
    vi.mocked(api.find).mockResolvedValue([
      { id: "owned", endpoint: owner.endpoint ?? "", events: ["email.sent"] },
      {
        id: "other",
        endpoint: "https://other.example.com",
        events: ["email.sent"],
      },
    ]);
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "ownership or subscriptions",
    );
    expect(api.remove).not.toHaveBeenCalled();
    expect(await readOwner(root)).toEqual(owner);
  });
  it("retains ownership on failed or unconfirmed deletion", async () => {
    const owner = await ownedEndpoint();
    owner.resendId = "owned";
    await saveOwner(root, owner);
    const api = registry();
    vi.mocked(api.get).mockRejectedValueOnce(new Error("unavailable"));
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow();
    expect(await readOwner(root)).toEqual(owner);
    vi.mocked(api.get).mockResolvedValue({
      id: "owned",
      endpoint: owner.endpoint ?? "",
      events: ["email.sent"],
    });
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "deletion was not confirmed",
    );
    expect(api.remove).toHaveBeenCalledExactlyOnceWith("owned");
    expect(await readOwner(root)).toEqual(owner);
    await expect(
      access(path.join(root, ".quantile/webhooks-cleanup")),
    ).rejects.toThrow();
  });
  it("refuses changed endpoints, mode, ownership and subscriptions", async () => {
    const owner = await ownedEndpoint();
    expect(() => assertOwner({ ...owner, mode: "live" as "test" })).toThrow();
    expect(() =>
      assertOwner({
        ...owner,
        endpoint: "https://production.example.com/api/resend/webhook",
      }),
    ).toThrow();
    await expect(
      saveOwner(root, {
        ...owner,
        token: `sample-${"a".repeat(32)}`,
        endpoint: undefined,
      }),
    ).rejects.toThrow("ownership changed");
    owner.resendId = "owned";
    await saveOwner(root, owner);
    const api = registry();
    vi.mocked(api.get).mockResolvedValue({
      id: "owned",
      endpoint: owner.endpoint ?? "",
      events: ["email.received"],
    });
    await expect(cleanupOwner(root, owner, api)).rejects.toThrow(
      "ownership or subscriptions",
    );
    expect(api.remove).not.toHaveBeenCalled();
  });
});
