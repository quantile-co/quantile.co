import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
it("refuses non-orbs and isolates Nix evaluation from runtime ingestion credentials", () => {
  const temporary = mkdtempSync(join(tmpdir(), "site-orb-hooks-"));
  const log = join(temporary, "calls");
  try {
    for (const tool of ["nix", "pnpm"]) {
      const path = join(temporary, tool);
      writeFileSync(
        path,
        `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({
  tool: ${JSON.stringify(tool)}, args, cwd: process.cwd(),
  endpoint: !!process.env.CLICKSTACK_OTLP_ENDPOINT,
  key: !!process.env.CLICKSTACK_API_KEY,
  docker: !!process.env.OTEL_DOCKER_STATS,
  config: process.env.NIX_CONFIG,
  shell: process.env.SHELL_READY,
}) + "\\n");
if (${JSON.stringify(tool)} === "nix") {
  if (args[0] === "store") console.log('{"trusted":true}');
  if (args[0] === "print-dev-env") console.log("export SHELL_READY=1");
  if (args[0] === "develop") {
    const command = args.indexOf("--command") + 1;
    const child = require("node:child_process").spawnSync(args[command], args.slice(command + 1), { stdio: "inherit" });
    if (child.error) throw child.error;
    process.exit(child.status ?? 1);
  }
}
if (${JSON.stringify(tool)} === "pnpm" && args.join(" ") === process.env.FAIL_COMMAND) process.exit(17);
`,
      );
      chmodSync(path, 0o755);
    }
    for (const phase of ["setup", "resume"]) {
      const invoke = (orb: string, failCommand = "") =>
        spawnSync("bash", [join(root, ".agents", phase)], {
          encoding: "utf8",
          env: {
            PATH: `${temporary}:${process.env.PATH}`,
            HOME: temporary,
            AMP_ORB: orb,
            FAIL_COMMAND: failCommand,
            CLICKSTACK_OTLP_ENDPOINT: "https://ingest.example.invalid",
            CLICKSTACK_API_KEY: "fixture",
            OTEL_DOCKER_STATS: "1",
          },
        });
      writeFileSync(log, "");
      expect(invoke("0").status).toBe(1);
      expect(readFileSync(log, "utf8")).toBe("");
      const result = invoke("1");
      expect(result.status, result.stderr).toBe(0);
      const calls = readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const nix = calls.filter((call) => call.tool === "nix");
      expect(
        nix.every((call) => !call.endpoint && !call.key && !call.docker),
      ).toBe(true);
      for (const prefix of [
        "extra-substituters",
        "extra-trusted-public-keys",
      ]) {
        const expected = readFileSync(join(root, ".envrc"), "utf8")
          .split("\n")
          .find((line) => line.startsWith(prefix))
          ?.replace(/"$/, "");
        expect(nix.at(-1).config).toContain(expected);
      }
      if (phase === "resume") {
        expect(calls.at(-1)).toMatchObject({
          tool: "pnpm",
          args: ["amp", "resume", "--directory", root.replace(/\/$/, "")],
          endpoint: true,
          key: true,
          docker: true,
          shell: "1",
        });
      } else {
        const expected = [
          ["install", "--frozen-lockfile"],
          ["run", "skills:sync"],
          ["amp", "setup"],
        ];
        const commands = () =>
          readFileSync(log, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
            .filter((call) => call.tool === "pnpm");
        expect(commands().map((call) => call.args)).toEqual(expected);
        expect(
          commands().every(
            (call) => !call.endpoint && !call.key && !call.docker,
          ),
        ).toBe(true);
        for (const [index, args] of expected.slice(0, -1).entries()) {
          writeFileSync(log, "");
          const failed = invoke("1", args.join(" "));
          expect(failed.status, failed.stderr).toBe(17);
          expect(commands().map((call) => call.args)).toEqual(
            expected.slice(0, index + 1),
          );
        }
      }
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
