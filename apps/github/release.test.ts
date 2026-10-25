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

it("publishes only a verified tag/release and fails closed before publication", () => {
  const work = mkdtempSync(join(tmpdir(), "source-release-"));
  const repo = join(work, "repo");
  const bin = join(work, "bin");
  const calls = join(work, "calls");
  const summary = join(work, "summary");
  mkdirSync(join(repo, "apps/web"), { recursive: true });
  mkdirSync(bin);
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  try {
    for (const name of [
      "tsconfig.json",
      "pnpm-workspace.yaml",
      "turbo.json",
      "apps/web/tsconfig.json",
      "apps/web/firebase.json",
      "apps/web/firestore.rules",
      "apps/web/next.config.ts",
      "apps/web/postcss.config.cjs",
      "pnpm-lock.yaml",
    ])
      writeFileSync(join(repo, name), "reviewed source\n");
    writeFileSync(join(repo, "package.json"), '{"private":true}\n');
    writeFileSync(
      join(repo, "apps/web/package.json"),
      '{"version":"1.2.3","scripts":{"build":"next build"}}\n',
    );
    git("init", "-q");
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "reviewed source",
    );
    const sha = git("rev-parse", "HEAD");
    writeFileSync(
      join(bin, "gh"),
      `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const env = process.env;
const call = args.join(" ");
fs.appendFileSync(env.MOCK_CALLS, call + "\\n");
const output = (value) => console.log(JSON.stringify(value));
if (call.includes("/actions/runs/123/attempts/1/jobs")) {
  output({jobs:[{name:"All",head_sha:env.APP_SHA,status:"completed",conclusion:"success"}]});
} else if (call.endsWith("/actions/runs/123")) {
  output({repository:{full_name:env.GITHUB_REPOSITORY},head_repository:{full_name:env.GITHUB_REPOSITORY},path:".github/workflows/check.yaml",event:"push",head_sha:env.MOCK_STALE === "yes" ? "0".repeat(40) : env.APP_SHA,status:"completed",conclusion:"success",run_attempt:1});
} else if (call.includes("/compare/")) {
  output({status:"ahead",merge_base_commit:{sha:env.APP_SHA}});
} else if (call.includes("/git/matching-refs/")) {
  if (env.MOCK_TAG_FAILURE === "yes") { console.error("Synthetic tag lookup failure"); process.exit(41); }
  output(env.MOCK_EXISTS === "yes" ? [{ref:"refs/tags/v1.2.3"}] : []);
} else if (call.startsWith("api --paginate --slurp")) {
  output([[]]);
} else if (call.startsWith("release create ")) {
  if (args.some(arg => arg.includes(".zip") || arg.includes(".rules") || arg.includes(".json"))) process.exit(92);
  fs.writeFileSync(env.MOCK_CREATED,"yes");
} else if (call.startsWith("release view ")) {
  console.log("789");
} else if (call.startsWith("release edit ")) {
  fs.writeFileSync(env.MOCK_PUBLISHED,"yes");
} else if (call.endsWith("/releases/789")) {
  const published=fs.existsSync(env.MOCK_PUBLISHED);
  output({id:789,name:"v1.2.3",tag_name:"v1.2.3",target_commitish:env.APP_SHA,draft:!published,immutable:published,assets:[]});
} else if (call.includes("/git/ref/tags/")) {
  output({object:{type:"commit",sha:env.APP_SHA}});
} else { console.error("Unexpected API call",call); process.exit(93); }
`,
      { mode: 0o755 },
    );
    const publish = (extra: Record<string, string> = {}) => {
      writeFileSync(calls, "");
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(new URL("./cli.ts", import.meta.url)),
          "build",
          "--tf-layer",
          "application",
        ],
        {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            SOURCE_DIR: repo,
            GH_TOKEN: "publisher-secret",
            APP_SHA: sha,
            CHECK_RUN_ID: "123",
            GITHUB_RUN_ID: "456",
            GITHUB_REPOSITORY: "quantile-co/quantile.co",
            RELEASE_VERSION: "v1.2.3",
            GITHUB_STEP_SUMMARY: summary,
            MOCK_CALLS: calls,
            MOCK_CREATED: join(work, "created"),
            MOCK_PUBLISHED: join(work, "published"),
            ...extra,
          },
          encoding: "utf8",
          timeout: 30_000,
        },
      );
      if (result.error) throw result.error;
      return result;
    };
    const failed = publish({ MOCK_TAG_FAILURE: "yes" });
    expect(failed.status).toBe(41);
    expect(failed.stderr).toContain("Synthetic tag lookup failure");
    expect(publish({ MOCK_STALE: "yes" }).status).not.toBe(0);
    const existing = publish({ MOCK_EXISTS: "yes" });
    expect(existing.status).not.toBe(0);
    expect(existing.stderr).toContain("Tag or release already exists");
    expect(publish({ RELEASE_VERSION: "v9.9.9" }).status).not.toBe(0);
    expect(readFileSync(calls, "utf8")).not.toContain("release create");
    // Mutable operator files are never packaged or used to determine the release version.
    writeFileSync(join(repo, "apps/web/package.json"), '{"version":"9.9.9"}\n');
    const published = publish();
    expect(published.status, published.stdout + published.stderr).toBe(0);
    const recorded = readFileSync(calls, "utf8");
    expect(recorded.match(/^release create /gm)).toHaveLength(1);
    expect(recorded.match(/^release edit /gm)).toHaveLength(1);
    expect(recorded).not.toMatch(
      /source\.zip|firestore\.rules|release\.json|release upload/,
    );
    expect(readFileSync(summary, "utf8")).toContain(sha);
    expect(readFileSync(summary, "utf8")).toContain("automatic source archive");

    const commit = () => {
      git("add", ".");
      git(
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-qm",
        "changed source",
      );
      return git("rev-parse", "HEAD");
    };
    writeFileSync(
      join(repo, "apps/web/package.json"),
      '{"version":"1.2.3","scripts":{"build":"touch candidate-code-ran"}}\n',
    );
    const badBuild = publish({ APP_SHA: commit() });
    expect(badBuild.status).not.toBe(0);
    expect(badBuild.stderr).toContain("Next build differs");
    expect(readFileSync(calls, "utf8")).not.toContain("release create");

    writeFileSync(
      join(repo, "apps/web/package.json"),
      '{"version":"1.2.3","scripts":{"build":"next build"}}\n',
    );
    rmSync(join(repo, "pnpm-workspace.yaml"));
    const missingWorkspace = publish({ APP_SHA: commit() });
    expect(missingWorkspace.status).not.toBe(0);
    expect(readFileSync(calls, "utf8")).not.toContain("release create");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
