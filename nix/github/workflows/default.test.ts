import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("binds releases to isolated, generated source and rejects API and tracked-file drift", () => {
  const root = new URL("../../../", import.meta.url);
  const expression = `let
    app = builtins.getFlake ${JSON.stringify(`git+${root.href}`)};
    factory = app.inputs.factory;
    pkgs = factory.inputs.nixpkgs.legacyPackages.\${builtins.currentSystem};
    lib = pkgs.lib;
    fakeGh = pkgs.writeShellScriptBin "gh" ''
      case "$*" in
        "api repos/quantile-co/quantile.co/actions/runs/123")
          printf '{"repository":{"full_name":"quantile-co/quantile.co"},"head_repository":{"full_name":"quantile-co/quantile.co"},"path":".github/workflows/check.yaml","event":"push","head_sha":"%s","status":"completed","conclusion":"success","run_attempt":1}\\n' "$APP_SHA" ;;
        *"/attempts/1/jobs?per_page=100")
          printf '{"jobs":[{"name":"All","head_sha":"%s","status":"completed","conclusion":"success"}]}\\n' "$APP_SHA" ;;
        *"/compare/"*)
          printf '{"status":"ahead","merge_base_commit":{"sha":"%s"}}\\n' "$APP_SHA" ;;
        *"/git/matching-refs/"*)
          if [ "''\${MOCK_TAG_FAILURE-}" = yes ]; then echo 'Synthetic tag lookup failure' >&2; exit 41; fi
          printf '[]\\n' ;;
        "api --paginate --slurp "*) printf '[]\\n' ;;
        *"/releases/generate-notes"*)
          cp "$RUNNER_TEMP"/quantile-release.*/source.zip "$RUNNER_TEMP/captured.zip"
          cp "$RUNNER_TEMP"/quantile-release.*/firestore.rules "$RUNNER_TEMP/captured.rules"
          cp "$RUNNER_TEMP"/quantile-release.*/release.json "$RUNNER_TEMP/captured.json"
          echo 'Publication blocked in the test' >&2; exit 43 ;;
        *) echo 'Unexpected API call or release write' >&2; exit 93 ;;
      esac
    '';
    fakeNix = pkgs.writeShellScriptBin "nix" ''
      test -z "''\${GH_TOKEN-}" || exit 47
      test "$(cat nix/hosting.txt)" = safe || exit 48
      printf '{"compilerOptions":{"strict":true}}\\n' > tsconfig.json
      printf '{"firestore":{"rules":"firestore.rules"},"hosting":{"public":"out"}}\\n' > firebase.json
      printf 'allow read, write: if false;\\n' > firestore.rules
    '';
    config = (lib.evalModules {
      modules = [
        factory.nixModules.coreutils factory.nixModules.diffutils factory.nixModules.git factory.nixModules.gh
        factory.nixModules.jq factory.nixModules.nix factory.nixModules.github
        (import ${fileURLToPath(new URL("./default.nix", import.meta.url))})
        ({ lib, ... }: {
          quantile.gh.package = fakeGh;
          quantile.nix.package = fakeNix;
        })
      ];
      specialArgs = { inherit pkgs; };
    }).config;
  in [ config.quantile.github.workflows.public.build.package pkgs.unzip ]`;
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
    { encoding: "utf8", timeout: 120_000 },
  );
  if (built.error) throw built.error;
  expect(built.status, built.stderr).toBe(0);
  const paths = built.stdout.trim().split("\n");
  const packagePath = paths.find((path) => path.endsWith("-build-release"));
  const unzipPath = paths.find((path) => /-unzip-\d/.test(path));
  if (!packagePath || !unzipPath)
    throw new Error("Nix did not build the release command and unzip");
  const command = join(packagePath, "bin/build-release");
  const unzip = join(unzipPath, "bin/unzip");
  const work = mkdtempSync(join(tmpdir(), "source-release-"));
  const repo = join(work, "repo");
  const run = (args: string[]) => {
    const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  try {
    mkdirSync(join(repo, "nix"), { recursive: true });
    writeFileSync(
      join(repo, ".gitignore"),
      "/tsconfig.json\n/firebase.json\n/firestore.rules\n",
    );
    writeFileSync(join(repo, "nix/hosting.txt"), "safe\n");
    writeFileSync(join(repo, "package.json"), '{"version":"1.2.3"}\n');
    run(["init", "-q"]);
    run(["add", "."]);
    run([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-qm",
      "reviewed source",
    ]);
    const sha = run(["rev-parse", "HEAD"]);
    writeFileSync(join(repo, "nix/hosting.txt"), "unreviewed\n");
    writeFileSync(join(repo, "firebase.json"), "unreviewed local config\n");
    const publish = (revision: string, failedTag = false) =>
      spawnSync(command, [repo], {
        env: {
          ...process.env,
          PATH: "/no-host-tools",
          GH_TOKEN: "publisher-secret",
          APP_SHA: revision,
          CHECK_RUN_ID: "123",
          GITHUB_RUN_ID: "456",
          GITHUB_REPOSITORY: "quantile-co/quantile.co",
          RELEASE_VERSION: "v1.2.3",
          RUNNER_TEMP: work,
          GITHUB_STEP_SUMMARY: join(work, "summary"),
          MOCK_TAG_FAILURE: failedTag ? "yes" : "no",
        },
        encoding: "utf8",
        timeout: 90_000,
      });
    const apiFailure = publish(sha, true);
    if (apiFailure.error) throw apiFailure.error;
    expect(
      apiFailure.status,
      `${apiFailure.signal ?? ""}\n${apiFailure.stdout}${apiFailure.stderr}`,
    ).toBe(41);
    expect(apiFailure.stderr).toContain("Synthetic tag lookup failure");
    const blocked = publish(sha);
    if (blocked.error) throw blocked.error;
    expect(blocked.status, blocked.stdout + blocked.stderr).toBe(43);
    const entry = (name: string) => {
      const result = spawnSync(
        unzip,
        ["-p", join(work, "captured.zip"), name],
        {
          encoding: "utf8",
        },
      );
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    expect(entry("firebase.json")).toContain('"public":"out"');
    expect(entry("tsconfig.json")).toContain('"strict":true');
    expect(entry("nix/hosting.txt")).toBe("safe\n");
    expect(entry("firestore.rules")).toBe(
      readFileSync(join(work, "captured.rules"), "utf8"),
    );
    expect(
      JSON.parse(readFileSync(join(work, "captured.json"), "utf8")),
    ).toMatchObject({
      app_sha: sha,
      schema_version: 1,
    });
    writeFileSync(join(repo, "nix/hosting.txt"), "safe\n");
    run(["add", "-f", "firebase.json"]);
    run([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-qm",
      "tracked config drift",
    ]);
    const mismatch = publish(run(["rev-parse", "HEAD"]));
    expect(mismatch.status).not.toBe(0);
    expect(mismatch.stderr).toContain("Tracked release input differs");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}, 240_000);
