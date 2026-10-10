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
import { runAssets } from "../../scripts/assets.mjs";

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
  it("rejects invalid arguments without writing assets", async () => {
    for (const args of [[], ["unknown"], ["generate", "extra"]]) {
      expect(await runAssets(args, root)).toBe(1);
      expect(await readdir(root)).toEqual([]);
    }
    expect(console.error).toHaveBeenCalledWith(
      "Usage: node scripts/assets.mjs <generate|check>",
    );
  });

  it("reports stale and missing assets without repairing them during checks", async () => {
    expect(await runAssets(["generate"], root)).toBe(0);
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
