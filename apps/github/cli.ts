import { execFileSync } from "node:child_process";
import {
  type Action,
  apply,
  CommandFailure,
  plan,
  processRunner,
  type TransportOptions,
} from "@quantile-co/factory-github";
import { Command, Option } from "commander";
import { publishRelease } from "./release.ts";

interface Options {
  tfLayer: "infrastructure";
  gcpTfStateBucket: string;
  gcpWifPool: string;
  ghRepoToken: string;
  ghPlanRef?: string;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const environment: NodeJS.ProcessEnv = {};
for (const name of [
  "PATH",
  "HOME",
  "TMPDIR",
  "TMP",
  "TEMP",
  "SYSTEMROOT",
  "USERPROFILE",
  "SSL_CERT_FILE",
  "NIX_SSL_CERT_FILE",
  "CLOUDSDK_CONFIG",
  "CLOUDSDK_CORE_PROJECT",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
  "GOOGLE_GHA_CREDS_PATH",
  "CLOUDSDK_AUTH_ACCESS_TOKEN",
]) {
  if (process.env[name] !== undefined) environment[name] = process.env[name];
}
const abort = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => abort.abort());

const program = new Command();
program
  .command("build")
  .addOption(
    new Option("--tf-layer <layer>")
      .choices(["application"])
      .makeOptionMandatory(),
  )
  .action(() => publishRelease(process.env, abort.signal));
for (const phase of ["plan", "apply"] as const) {
  const command = program
    .command(phase)
    .addOption(
      new Option("--tf-layer <layer>", "Repository deployment layer")
        .choices(["infrastructure"])
        .makeOptionMandatory(),
    )
    .addOption(
      new Option("--gcp-tf-state-bucket <name>", "State and saved-plan bucket")
        .env("GCP_TF_STATE_BUCKET")
        .makeOptionMandatory(),
    )
    .addOption(
      new Option("--gcp-wif-pool <name>", "Trusted workload identity pool")
        .env("GCP_WIF_POOL")
        .makeOptionMandatory(),
    )
    .addOption(
      new Option(
        "--gh-repo-token <token>",
        "Repository credential; prefer GH_REPO_TOKEN",
      )
        .env("GH_REPO_TOKEN")
        .makeOptionMandatory(),
    );
  if (phase === "apply")
    command.addOption(
      new Option(
        "--gh-plan-ref <run/attempt/generation>",
        "Reviewed saved plan",
      )
        .env("GH_PLAN_REF")
        .makeOptionMandatory(),
    );
  command.action(async (options: Options) => {
    process.chdir(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        encoding: "utf8",
      }).trim(),
    );
    const transport: TransportOptions = {
      bucket: options.gcpTfStateBucket,
      repositoryId: required("GITHUB_REPOSITORY_ID"),
      runId: required("GITHUB_RUN_ID"),
      attempt: required("GITHUB_RUN_ATTEMPT"),
      scratchDirectory: required("RUNNER_TEMP"),
      signal: abort.signal,
    };
    const provider = processRunner({
      ...environment,
      TF_IN_AUTOMATION: "true",
      TF_INPUT: "0",
      GH_REPO: required("GITHUB_REPOSITORY"),
      GITHUB_TOKEN: options.ghRepoToken,
      REST_API_BEARER: options.ghRepoToken,
      TF_VAR_gcp_wif_pool: options.gcpWifPool,
    });
    const action: Action = async ({ planFile, logFile, signal }) => {
      await provider(
        "tofu",
        [
          "-chdir=tf",
          "init",
          "-input=false",
          "-lockfile=readonly",
          `-backend-config=bucket=${options.gcpTfStateBucket}`,
          "-backend-config=prefix=quantile.co/prod/infrastructure",
        ],
        { logFile, append: true, signal },
      );
      await provider(
        "tofu",
        phase === "plan"
          ? [
              "-chdir=tf",
              "plan",
              "-input=false",
              "-no-color",
              `-out=${planFile}`,
            ]
          : ["-chdir=tf", "apply", "-input=false", planFile],
        { logFile, append: true, signal },
      );
      if (
        phase === "apply" &&
        options.gcpTfStateBucket === "quantile-co-9e46-tf-state"
      ) {
        const rows: {
          url: string;
          metadata?: { name: string; generation: string; timeDeleted?: string };
        }[] = JSON.parse(
          await storage(
            "gcloud",
            [
              "storage",
              "ls",
              "--all-versions",
              "--json",
              `gs://${options.gcpTfStateBucket}/**`,
            ],
            { signal },
          ),
        );
        for (const { url, metadata } of rows) {
          const name = metadata?.name;
          if (
            !metadata ||
            !name ||
            name.endsWith(".tflock") ||
            !(
              name.startsWith("state-backups/") ||
              ([
                "repository/prod/default.tfstate",
                "quantile.co/prod/infrastructure/default.tfstate",
              ].includes(name) &&
                metadata?.timeDeleted)
            )
          )
            continue;
          if (
            !/^[1-9][0-9]*$/.test(metadata.generation) ||
            url !==
              `gs://${options.gcpTfStateBucket}/${name}#${metadata.generation}`
          )
            throw new Error("Expected exact-generation cleanup object");
          await storage("gcloud", ["storage", "rm", url], {
            logFile,
            append: true,
            signal,
          });
        }
      }
    };
    const storage = processRunner(environment);
    if (phase === "plan")
      await plan(
        { ...transport, summaryFile: required("GITHUB_STEP_SUMMARY") },
        action,
        storage,
      );
    else {
      if (!options.ghPlanRef) throw new Error("Missing GH_PLAN_REF");
      await apply(
        { ...transport, planReference: options.ghPlanRef },
        action,
        storage,
      );
    }
  });
}

try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof CommandFailure ? error.exitCode : 1;
}
