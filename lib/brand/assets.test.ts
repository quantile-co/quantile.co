import {
  access,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAssets } from "./assets.ts";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "quantile-assets-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("brand asset commands", () => {
  it.each([
    [],
    ["unknown"],
    ["generate", "extra"],
  ])("rejects invalid arguments without writing assets: %j", async (...args) => {
    expect(await runAssets(args, root)).toBe(1);
    expect(await readdir(root)).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "Usage: pnpm assets:generate | pnpm assets:check",
    );
  });

  it("generates deterministic assets and verifies them without modifying them", async () => {
    expect(await runAssets(["generate"], root)).toBe(0);
    const icon = await readFile(path.join(root, "app/icon.svg"));
    const social = await readFile(path.join(root, "app/opengraph-image.png"));
    expect(await runAssets(["check"], root)).toBe(0);
    expect(await runAssets(["generate"], root)).toBe(0);
    expect(await readFile(path.join(root, "app/icon.svg"))).toEqual(icon);
    expect(await readFile(path.join(root, "app/opengraph-image.png"))).toEqual(
      social,
    );
    expect(await readFile(path.join(root, "app/twitter-image.png"))).toEqual(
      social,
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reports both stale and missing assets without repairing them during checks", async () => {
    await runAssets(["generate"], root);
    const stale = path.join(root, "app/icon.svg");
    const missing = path.join(root, "app/favicon.ico");
    await writeFile(stale, "outdated");
    await rm(missing);
    expect(await runAssets(["check"], root)).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("app/icon.svg"),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("app/favicon.ico"),
    );
    expect(await readFile(stale, "utf8")).toBe("outdated");
    await expect(access(missing)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
