import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("aborts on a failed tag lookup instead of treating it as an absent tag", () => {
  const root = new URL("../", import.meta.url);
  const sha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  expect(sha.status, sha.stderr).toBe(0);
  const expression = `let
    app = builtins.getFlake ${JSON.stringify(`git+${root.href}`)};
    factory = app.inputs.factory;
    pkgs = factory.inputs.nixpkgs.legacyPackages.\${builtins.currentSystem};
    lib = pkgs.lib;
    mock = pkgs.writeShellScriptBin "gh" ''
      case "$*" in
        "api repos/quantile-co/quantile.co/actions/runs/123")
          printf '{"repository":{"full_name":"quantile-co/quantile.co"},"head_repository":{"full_name":"quantile-co/quantile.co"},"path":".github/workflows/check.yaml","event":"push","head_sha":"%s","status":"completed","conclusion":"success","run_attempt":1}\\n' "$APP_SHA" ;;
        *"/attempts/1/jobs?per_page=100")
          printf '{"jobs":[{"name":"All","head_sha":"%s","status":"completed","conclusion":"success"}]}\\n' "$APP_SHA" ;;
        *"/compare/"*)
          printf '{"status":"ahead","merge_base_commit":{"sha":"%s"}}\\n' "$APP_SHA" ;;
        *"/git/matching-refs/"*) echo 'Synthetic tag lookup failure' >&2; exit 41 ;;
        *) echo 'Unexpected API call or release write' >&2; exit 93 ;;
      esac
    '';
    config = (lib.evalModules {
      modules = [ factory.nixModules.coreutils factory.nixModules.git factory.nixModules.gh factory.nixModules.jq { quantile.gh.package = mock; } ];
      specialArgs = { inherit pkgs; };
    }).config;
    in import ${fileURLToPath(new URL("./build.nix", import.meta.url))} { inherit config lib pkgs; }`;
  const built = spawnSync(
    "nix",
    [
      "build",
      "--no-link",
      "--print-out-paths",
      "--impure",
      "--expr",
      expression,
    ],
    {
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  expect(built.status, built.stderr).toBe(0);
  const work = mkdtempSync(join(tmpdir(), "quantile-release-test-"));
  try {
    const result = spawnSync(
      join(built.stdout.trim(), "bin/build-release"),
      [fileURLToPath(root)],
      {
        env: {
          HOME: work,
          NODE_ENV: "test",
          PATH: "/no-host-tools",
          GIT_CONFIG_NOSYSTEM: "1",
          GH_TOKEN: "fixture",
          APP_SHA: sha.stdout.trim(),
          CHECK_RUN_ID: "123",
          GITHUB_RUN_ID: "456",
          GITHUB_REPOSITORY: "quantile-co/quantile.co",
          RELEASE_VERSION: "v1.2.3",
          RUNNER_TEMP: work,
          GITHUB_STEP_SUMMARY: join(work, "summary"),
        },
        encoding: "utf8",
        timeout: 20_000,
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(41);
    expect(result.stderr).toContain("Synthetic tag lookup failure");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}, 150_000);
