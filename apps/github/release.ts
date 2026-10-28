import { type ExecFileException, execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";
import { CommandFailure } from "@quantile-co/factory-github";

export async function publishRelease(
  env: NodeJS.ProcessEnv,
  signal: AbortSignal,
) {
  const required = (name: string) => {
    const value = env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  };
  required("GH_TOKEN");
  const sha = required("APP_SHA");
  const check = required("CHECK_RUN_ID");
  const version = required("RELEASE_VERSION");
  const run = required("GITHUB_RUN_ID");
  const summary = required("GITHUB_STEP_SUMMARY");
  const repository = required("GITHUB_REPOSITORY");
  if (
    repository !== "quantile-co/quantile.co" ||
    !/^[0-9a-f]{40}$/.test(sha) ||
    !/^[1-9][0-9]*$/.test(check) ||
    !/^[1-9][0-9]*$/.test(run) ||
    !/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)
  )
    throw new Error("Invalid release identity");
  const cwd = required("SOURCE_DIR");
  // Only inspect committed Git objects; never execute candidate code.
  const execute = async (command: string, args: string[]) => {
    signal.throwIfAborted();
    try {
      const { stdout } = await promisify(execFile)(command, args, {
        cwd,
        env: { ...env, GH_REPO: repository },
        signal,
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 20_000_000,
      });
      return stdout.trim();
    } catch (error) {
      signal.throwIfAborted();
      const failure = error as ExecFileException & { stderr?: string };
      if (failure.stderr) console.error(failure.stderr.trim());
      throw new CommandFailure(
        typeof failure.code === "number" ? failure.code : 1,
        `${command} failed`,
      );
    }
  };
  const git = (...args: string[]) => execute("git", args);
  const gh = (...args: string[]) => execute("gh", args);
  const api = async (path: string) =>
    JSON.parse(await gh("api", `repos/${repository}/${path}`));
  if ((await git("rev-parse", "HEAD")) !== sha)
    throw new Error("Candidate checkout differs from reviewed SHA");
  const checked = await api(`actions/runs/${check}`);
  if (
    checked.repository?.full_name !== repository ||
    checked.head_repository?.full_name !== repository ||
    checked.path !== ".github/workflows/check.yaml" ||
    checked.event !== "push" ||
    checked.head_sha !== sha ||
    checked.status !== "completed" ||
    checked.conclusion !== "success" ||
    !Number.isSafeInteger(checked.run_attempt) ||
    checked.run_attempt <= 0
  )
    throw new Error("Check does not qualify the reviewed source");
  const jobs = await api(
    `actions/runs/${check}/attempts/${checked.run_attempt}/jobs?per_page=100`,
  );
  if (
    !Array.isArray(jobs.jobs) ||
    !jobs.jobs.some(
      (job: Record<string, unknown>) =>
        job.name === "All" &&
        job.head_sha === sha &&
        job.status === "completed" &&
        job.conclusion === "success",
    )
  )
    throw new Error("Check attempt has no successful exact-source All job");
  const comparison = await api(`compare/${sha}...main`);
  if (
    !["ahead", "identical"].includes(comparison.status) ||
    comparison.merge_base_commit?.sha !== sha
  )
    throw new Error("Reviewed source is not on main ancestry");
  // Failed API reads are errors, never evidence that a tag or draft is absent.
  const tags = await api(`git/matching-refs/tags/${version}`);
  const releases = JSON.parse(
    await gh(
      "api",
      "--paginate",
      "--slurp",
      `repos/${repository}/releases?per_page=100`,
    ),
  );
  if (
    !Array.isArray(tags) ||
    !Array.isArray(releases) ||
    releases.some((page) => !Array.isArray(page))
  )
    throw new Error("Malformed tag or release listing");
  if (
    tags.some((tag) => tag.ref === `refs/tags/${version}`) ||
    releases.flat().some((release) => release.tag_name === version)
  )
    throw new Error(
      "Tag or release already exists; inspect it before any retry. Draft recovery is manual.",
    );
  const pkg = JSON.parse(await git("show", `${sha}:apps/web/package.json`));
  if (`v${pkg.version}` !== version || pkg.scripts?.build !== "next build")
    throw new Error(
      "Application package version or Next build differs from the release contract",
    );
  for (const file of [
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "turbo.json",
    "tsconfig.json",
    "apps/web/package.json",
    "apps/web/tsconfig.json",
    "apps/web/next.config.ts",
    "apps/web/postcss.config.cjs",
  ])
    if ((await git("cat-file", "-t", `${sha}:${file}`)) !== "blob")
      throw new Error(`Missing committed source file ${file}`);
  await gh(
    "release",
    "create",
    version,
    "--target",
    sha,
    "--title",
    version,
    "--generate-notes",
    "--latest=false",
    "--draft",
  );
  const id = await gh(
    "release",
    "view",
    version,
    "--json",
    "databaseId",
    "--jq",
    ".databaseId",
  );
  if (!/^[1-9][0-9]*$/.test(id)) throw new Error("Invalid release identity");
  const verify = (release: Record<string, unknown>, draft: boolean) => {
    if (
      release.id !== Number(id) ||
      release.name !== version ||
      release.tag_name !== version ||
      release.target_commitish !== sha ||
      release.draft !== draft ||
      (!draft && release.immutable !== true) ||
      !Array.isArray(release.assets) ||
      release.assets.length !== 0
    )
      throw new Error("Release verification failed; inspect before proceeding");
  };
  verify(await api(`releases/${id}`), true);
  await gh("release", "edit", version, "--draft=false");
  let published: Record<string, unknown> | undefined;
  // Retry reads only, never publication writes.
  for (let attempt = 0; attempt < 12; attempt++) {
    const release = await api(`releases/${id}`);
    if (release.draft === false && release.immutable === true) {
      published = release;
      break;
    }
    if (attempt < 11) await setTimeout(5000, undefined, { signal });
  }
  if (!published)
    throw new Error(
      "Immutability verification failed; inspect before proceeding",
    );
  verify(published, false);
  const tag = await api(`git/ref/tags/${version}`);
  if (tag.object?.type !== "commit" || tag.object?.sha !== sha)
    throw new Error("Published tag differs from reviewed source");
  await appendFile(
    summary,
    `Published immutable release \`${version}\` from Check \`${check}\` (SHA \`${sha}\`). Use the automatic source archive from GitHub.\n`,
  );
}
