import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

vi.mock("@quantile-co/factory-amp", () => ({
  setup: vi.fn(),
  resume: vi.fn(),
  connect: vi.fn(),
  list: vi.fn(),
}));

import { connect, resume, setup } from "@quantile-co/factory-amp";
import { cli } from "./cli";

it("delegates the explicit repository/path and installs only the packaged keep-awake plugin", async () => {
  const temporary = mkdtempSync(join(tmpdir(), "site-amp-"));
  vi.stubEnv("XDG_CONFIG_HOME", temporary);
  try {
    await cli.parseAsync(["setup"], { from: "user" });
    expect(setup).toHaveBeenCalledOnce();
    const plugin = join(temporary, "amp/plugins/factory-orb-awake.js");
    expect(readFileSync(plugin, "utf8")).toBe(
      readFileSync(
        new URL(import.meta.resolve("@quantile-co/factory-amp/plugin")),
        "utf8",
      ),
    );
    expect(statSync(plugin).mode & 0o777).toBe(0o644);
    await cli.parseAsync(
      ["resume", "--directory", "/disposable/repo", "--thread", "test-thread"],
      { from: "user" },
    );
    expect(resume).toHaveBeenCalledWith(
      { repository: "quantile-co/quantile.co", thread: "test-thread" },
      "/disposable/repo",
    );
    await cli.parseAsync(
      ["connect", "--thread", "test-thread", "--title", "Manual test"],
      { from: "user" },
    );
    expect(connect).toHaveBeenCalledWith({
      repository: "quantile-co/quantile.co",
      thread: "test-thread",
      title: "Manual test",
    });
  } finally {
    vi.unstubAllEnvs();
    rmSync(temporary, { recursive: true, force: true });
  }
});
