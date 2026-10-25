import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const repository = "quantile-co/quantile.co";
const bucket = "quantile-co-9e46-tf-state";
const states = [
  {
    layer: "infrastructure",
    from: "repository/prod",
    to: "quantile.co/prod/infrastructure",
  },
];

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sorted(item)]),
    );
  return value;
}

export function stateDigest(bytes: Uint8Array) {
  const state = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (
    state.version !== 4 ||
    typeof state.lineage !== "string" ||
    !state.lineage ||
    !Number.isSafeInteger(state.serial) ||
    state.serial < 0 ||
    !Array.isArray(state.resources) ||
    !state.outputs ||
    typeof state.outputs !== "object"
  )
    throw new Error("Invalid state snapshot");
  return createHash("sha256")
    .update(JSON.stringify(sorted(state)))
    .digest("hex");
}

export function verifyTransition(
  before: Uint8Array,
  after: Uint8Array,
  increment = 1,
) {
  const original = JSON.parse(Buffer.from(before).toString("utf8"));
  const migrated = JSON.parse(Buffer.from(after).toString("utf8"));
  stateDigest(before);
  stateDigest(after);
  if (
    migrated.serial !== original.serial + increment ||
    stateDigest(
      Buffer.from(JSON.stringify({ ...original, serial: migrated.serial })),
    ) !== stateDigest(after)
  )
    throw new Error("Unexpected state migration transition");
}

export function migrationAnswer(output: string, backend = "gcs") {
  // OpenTofu 1.13.1 refreshes both states under its native locks before this prompt.
  // The non-empty-destination prompt has the same query but a different description.
  const text = output.replace(/\s+/g, " ");
  return text.includes(
    `No existing state was found in the newly configured "${backend}" backend.`,
  ) &&
    !text.includes("An existing non-empty state already exists") &&
    text.includes("Do you want to copy existing state to the new backend?")
    ? "yes\n"
    : "no\n";
}

export async function migrateBackend(
  args: string[],
  env: NodeJS.ProcessEnv,
  log: string,
  backend = "gcs",
) {
  const fd = openSync(log, "a", 0o600);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("tofu", args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let output = "",
        answered = false,
        refused = false;
      const timer = setTimeout(() => {
        refused = true;
        child.kill("SIGINT");
      }, 300_000);
      const receive = (data: Buffer) => {
        appendFileSync(fd, data);
        output = (output + data.toString()).slice(-100_000);
        if (!answered && output.includes("Enter a value:")) {
          answered = true;
          const answer = migrationAnswer(output, backend);
          refused = answer !== "yes\n";
          child.stdin.end(answer);
        }
      };
      child.stdout.on("data", receive);
      child.stderr.on("data", receive);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        if (code === 0 && answered && !refused) resolve();
        else
          reject(
            new Error(
              "Native backend migration did not complete with an empty-destination confirmation",
            ),
          );
      });
    });
  } finally {
    closeSync(fd);
  }
}

async function main(env: NodeJS.ProcessEnv) {
  process.umask(0o077);
  const required = (key: string) => {
    const value = env[key];
    if (!value) throw new Error(`Missing ${key}`);
    return value;
  };
  if (
    env.GITHUB_ACTIONS !== "true" ||
    required("GITHUB_REPOSITORY") !== repository ||
    required("GITHUB_REF") !== "refs/heads/main" ||
    required("GITHUB_EVENT_NAME") !== "workflow_dispatch" ||
    required("GITHUB_WORKFLOW_REF") !==
      `${repository}/.github/workflows/apply.yaml@refs/heads/main` ||
    required("GCP_TF_STATE_BUCKET") !== bucket
  )
    throw new Error("Migration workflow identity differs");
  const phase = required("MIGRATION_PHASE");
  if (
    !["preflight", "migrate"].includes(phase) ||
    required("MIGRATION_CONFIRM") !== repository
  )
    throw new Error("Migration phase or confirmation differs");
  const runId = required("GITHUB_RUN_ID"),
    attempt = required("GITHUB_RUN_ATTEMPT"),
    repoId = required("GITHUB_REPOSITORY_ID"),
    revision = required("GITHUB_SHA");
  if (
    ![runId, attempt, repoId].every((value) => /^[1-9][0-9]*$/.test(value)) ||
    !/^[0-9a-f]{40}$/.test(revision)
  )
    throw new Error("Invalid workflow metadata");
  const scratch = mkdtempSync(
    join(required("RUNNER_TEMP"), "backend-migration-"),
  );
  const log = join(scratch, "migration.log");
  writeFileSync(log, "", { mode: 0o600, flag: "wx" });
  const backupPrefix = `state-backups/${repoId}/${runId}/${attempt}`;
  const providerEnv: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH",
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SSL_CERT_FILE",
    "NIX_SSL_CERT_FILE",
    "CLOUDSDK_CONFIG",
    "CLOUDSDK_CORE_PROJECT",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
    "GOOGLE_GHA_CREDS_PATH",
  ])
    if (env[key] !== undefined) providerEnv[key] = env[key];
  providerEnv.TF_IN_AUTOMATION = "true";
  providerEnv.TF_WORKSPACE = "default";
  const command = (name: string, args: string[], localEnv = providerEnv) => {
    const result = spawnSync(name, args, {
      env: localEnv,
      encoding: "buffer",
      maxBuffer: 100_000_000,
    });
    if (name !== "gcloud")
      appendFileSync(
        log,
        Buffer.concat([
          result.stdout ?? Buffer.alloc(0),
          result.stderr ?? Buffer.alloc(0),
        ]),
      );
    if (result.error || result.status !== 0)
      throw new Error("Migration command failed; inspect private diagnostics");
    return result.stdout;
  };
  const token = command("gcloud", ["auth", "print-access-token"])
    .toString()
    .trim();
  if (!token) throw new Error("Missing workflow access token");
  const storage = async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
      signal: AbortSignal.timeout(60_000),
      redirect: "error",
    });
    return response;
  };
  const objectUrl = (name: string) =>
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}`;
  const metadata = async (name: string) => {
    const response = await storage(objectUrl(name));
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error("Object metadata access failed");
    const data = (await response.json()) as {
      generation: string;
      size: string;
    };
    if (!/^[1-9][0-9]*$/.test(data.generation) || !/^[0-9]+$/.test(data.size))
      throw new Error("Invalid object metadata");
    return data;
  };
  const bytes = async (name: string, generation: string) => {
    const response = await storage(
      `${objectUrl(name)}?alt=media&generation=${generation}`,
    );
    if (!response.ok) throw new Error("Exact-generation object read failed");
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0 || body.length > 100_000_000)
      throw new Error("Invalid state size");
    return body;
  };
  const create = async (name: string, body: Buffer) => {
    const response = await storage(
      `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}&ifGenerationMatch=0`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(body),
      },
    );
    if (!response.ok) throw new Error("Create-only backup upload failed");
    const data = (await response.json()) as { generation: string };
    if (!/^[1-9][0-9]*$/.test(data.generation))
      throw new Error("Invalid backup generation");
    return data.generation;
  };
  const noDestination = async (prefix: string) => {
    const response = await storage(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(`${prefix}/`)}&versions=true&maxResults=1`,
    );
    if (!response.ok) throw new Error("Destination history access failed");
    const data = (await response.json()) as {
      items?: unknown[];
      nextPageToken?: string;
    };
    if ((data.items?.length ?? 0) > 0 || data.nextPageToken)
      throw new Error("Destination is not unused");
  };
  const workflowGate = async () => {
    const get = async (path: string) => {
      const response = await fetch(
        `https://api.github.com/repos/${repository}/${path}`,
        {
          headers: {
            Authorization: `Bearer ${required("GITHUB_TOKEN")}`,
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("Workflow gate read failed");
      return response.json();
    };
    const ref = await get("git/ref/heads/main");
    if (ref.object?.sha !== revision)
      throw new Error("Main changed during migration");
    for (const status of [
      "in_progress",
      "queued",
      "waiting",
      "pending",
      "requested",
    ]) {
      const runs = await get(`actions/runs?status=${status}&per_page=100`);
      if (
        !Array.isArray(runs.workflow_runs) ||
        runs.total_count > 100 ||
        runs.workflow_runs.some(
          (run: { id: number; path: string }) =>
            String(run.id) !== runId &&
            [
              ".github/workflows/plan.yaml",
              ".github/workflows/apply.yaml",
            ].includes(run.path),
        )
      )
        throw new Error("Another production writer is active or queued");
    }
  };
  let stage = "preflight";
  try {
    const version = JSON.parse(
      command("tofu", ["version", "-json"]).toString(),
    );
    if (version.terraform_version !== "1.13.1")
      throw new Error("Unexpected OpenTofu version");
    await workflowGate();
    const bucketResponse = await storage(
      `https://storage.googleapis.com/storage/v1/b/${bucket}`,
    );
    if (!bucketResponse.ok)
      throw new Error("Bucket safeguards cannot be verified");
    const bucketData = (await bucketResponse.json()) as {
      versioning?: { enabled?: boolean };
      iamConfiguration?: {
        publicAccessPrevention?: string;
        uniformBucketLevelAccess?: { enabled?: boolean };
      };
    };
    if (
      !bucketData.versioning?.enabled ||
      bucketData.iamConfiguration?.publicAccessPrevention !== "enforced" ||
      !bucketData.iamConfiguration?.uniformBucketLevelAccess?.enabled
    )
      throw new Error("Bucket safeguards differ");
    const snapshots = [];
    for (const state of states) {
      const source = `${state.from}/default.tfstate`;
      const original = await metadata(source);
      if (!original || Number(original.size) <= 0)
        throw new Error("Source state is absent");
      if (
        (await metadata(`${state.from}/default.tflock`)) ||
        (await metadata(`${state.to}/default.tflock`))
      )
        throw new Error("A state lock is active");
      await noDestination(state.to);
      const before = await bytes(source, original.generation);
      stateDigest(before);
      if (JSON.parse(before.toString()).terraform_version !== "1.13.1")
        throw new Error("Unexpected source state version");
      snapshots.push({ ...state, source, original, before });
    }
    if (phase === "preflight") {
      console.log(
        "Read-only preflight passed; no state or backup was written.",
      );
      return;
    }
    for (const state of snapshots) {
      stage = `${state.layer}:backup`;
      await workflowGate();
      await noDestination(state.to);
      if (
        (await metadata(state.source))?.generation !== state.original.generation
      )
        throw new Error("Source changed before backup");
      const backup = `${backupPrefix}/${state.layer}.tfstate`;
      const backupGeneration = await create(backup, state.before);
      if (
        !Buffer.from(await bytes(backup, backupGeneration)).equals(state.before)
      )
        throw new Error("Backup readback differs");
      const directory = join(scratch, state.layer);
      mkdirSync(directory, { mode: 0o700 });
      writeFileSync(
        join(directory, "backend.tf"),
        'terraform {\n  backend "gcs" {}\n}\n',
        { mode: 0o600, flag: "wx" },
      );
      const localEnv = {
        ...providerEnv,
        TF_DATA_DIR: join(directory, ".terraform"),
      };
      stage = `${state.layer}:initialize-source`;
      command(
        "tofu",
        [
          `-chdir=${directory}`,
          "init",
          "-input=false",
          "-lockfile=readonly",
          `-backend-config=bucket=${bucket}`,
          `-backend-config=prefix=${state.from}`,
        ],
        localEnv,
      );
      if (
        command(
          "tofu",
          [`-chdir=${directory}`, "workspace", "list", "-no-color"],
          localEnv,
        )
          .toString()
          .trim() !== "* default"
      )
        throw new Error("Unexpected state workspaces");
      const before = command(
        "tofu",
        [`-chdir=${directory}`, "state", "pull"],
        localEnv,
      );
      if (stateDigest(before) !== stateDigest(state.before))
        throw new Error(
          "Native source snapshot differs from the backed-up object",
        );
      if (
        (await metadata(state.source))?.generation !== state.original.generation
      )
        throw new Error("Source changed before migration");
      await noDestination(state.to);
      stage = `${state.layer}:native-migration`;
      await migrateBackend(
        [
          `-chdir=${directory}`,
          "init",
          "-migrate-state",
          "-input=true",
          "-no-color",
          "-lockfile=readonly",
          `-backend-config=bucket=${bucket}`,
          `-backend-config=prefix=${state.to}`,
        ],
        localEnv,
        log,
      );
      stage = `${state.layer}:verify`;
      const after = command(
        "tofu",
        [`-chdir=${directory}`, "state", "pull"],
        localEnv,
      );
      verifyTransition(before, after);
      const destination = `${state.to}/default.tfstate`,
        destinationMetadata = await metadata(destination);
      if (!destinationMetadata) throw new Error("Destination state is absent");
      verifyTransition(
        state.before,
        await bytes(destination, destinationMetadata.generation),
      );
      if (
        (await metadata(state.source))?.generation !== state.original.generation
      )
        throw new Error("Source changed during migration");
      if (
        (await metadata(`${state.from}/default.tflock`)) ||
        (await metadata(`${state.to}/default.tflock`))
      )
        throw new Error("Native migration left a state lock");
      await workflowGate();
      stage = `${state.layer}:retire-old-object`;
      if (
        (await metadata(destination))?.generation !==
        destinationMetadata.generation
      )
        throw new Error("Destination changed before source retirement");
      const retired = await storage(
        `${objectUrl(state.source)}?ifGenerationMatch=${state.original.generation}`,
        { method: "DELETE" },
      );
      if (retired.status !== 204 || (await metadata(state.source)))
        throw new Error("Old state retirement was not verified");
      const result = `${state.layer}: verified same state at ${state.to}; backup ${backup}#${backupGeneration}; destination generation ${destinationMetadata.generation}.\n`;
      appendFileSync(required("GITHUB_STEP_SUMMARY"), result);
      console.log(
        `${state.layer}: native migration and exact state verification passed.`,
      );
    }
  } catch {
    if (phase === "migrate") {
      try {
        await create(`${backupPrefix}/migration.log`, readFileSync(log));
      } catch {
        /* State backups already uploaded remain protected. */
      }
    }
    throw new Error(
      `Stopped at ${stage}; inspect private state backups and diagnostics under gs://${bucket}/${backupPrefix}/. Do not retry automatically.`,
    );
  }
}

if (import.meta.main) {
  try {
    await main(process.env);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "State migration failed",
    );
    process.exitCode = 1;
  }
}
