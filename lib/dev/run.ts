import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Command, CommanderError, Option } from "commander";
import {
  loadDevelopmentEnvironment,
  readIntegrationSettings,
  readTargetSettings,
} from "../env/env.ts";
import { validateFirestoreConfig } from "../gcp/firestore.ts";
import { readIntegrationTarget } from "../stripe/test.ts";
import { startEmulator } from "./emulator.ts";
import {
  type IntegrationConfig,
  resendRegistry,
  startIntegration,
} from "./integration.ts";
import {
  acquireOwner,
  cleanupOwner,
  localAppInstance,
  ownerIsRunning,
  readOwner,
} from "./ownership.ts";
import {
  childEnvironment,
  createProcessRunner,
  type Environment,
  freePort,
  type Start,
  until,
} from "./process.ts";

// Command selection and process ownership stay here; shared env validation
// lives in lib/env and is applied to the launcher's current snapshot.
export function readIntegrationConfig(
  env: Environment,
  appInstance: string,
): IntegrationConfig {
  return readIntegrationSettings(env, appInstance);
}
function validateTargetInputs(env: Environment) {
  validateFirestoreConfig(readTargetSettings(env));
}

type DevelopmentCommand =
  | { kind: "dev" | "integrated-dev"; port?: string }
  | { kind: "unit-test" | "integrated-test" | "cleanup" }
  | { kind: "target-test"; target: string };
export function parseCommand(args: string[]): DevelopmentCommand | undefined {
  const cli = new Command()
    .name("pnpm dev")
    .description(
      "Local application and Firestore emulator; --integration adds remote providers.",
    )
    .option("--integration", "Connect Stripe and Resend")
    .option(
      "--cleanup-integration",
      "Verify cleanup of this checkout's stopped integration",
    )
    .option("--port <port>", "Development HTTP port (overrides PORT)")
    .option(
      "--target <url>",
      "Caller-owned webhook target for integration tests",
    )
    .addOption(new Option("--test", "Run the selected test suite").hideHelp())
    .exitOverride()
    .configureOutput({ writeErr: () => {} });
  try {
    cli.parse(args, { from: "user" });
  } catch (error) {
    if (
      error instanceof CommanderError &&
      error.code === "commander.helpDisplayed"
    )
      return undefined;
    throw new Error("Invalid arguments. Use pnpm dev --help.");
  }
  const v = cli.opts<{
    integration?: boolean;
    cleanupIntegration?: boolean;
    test?: boolean;
    target?: string;
    port?: string;
  }>();
  if (
    (v.cleanupIntegration &&
      (v.integration ||
        v.test ||
        v.target !== undefined ||
        v.port !== undefined)) ||
    (v.target !== undefined && !(v.test && v.integration)) ||
    (v.port !== undefined && v.test)
  )
    throw new Error(
      "Incompatible arguments: --target requires integration tests; --port is for development; cleanup is exclusive.",
    );
  if (v.cleanupIntegration) return { kind: "cleanup" };
  if (v.target !== undefined)
    return { kind: "target-test", target: readIntegrationTarget(v.target) };
  if (v.test) return { kind: v.integration ? "integrated-test" : "unit-test" };
  return { kind: v.integration ? "integrated-dev" : "dev", port: v.port };
}

const output = (text: string) => process.stdout.write(`${text}\n`);
function startTests(
  root: string,
  start: Start,
  env: Environment,
  project: "unit" | "integration",
) {
  return start(
    "Tests",
    process.execPath,
    [
      path.join(root, "node_modules/vitest/vitest.mjs"),
      `--project=${project}`,
      ...(project === "unit" ? ["--project=storybook"] : []),
      "--run",
    ],
    {
      ...childEnvironment(
        env,
        project === "unit" ? "unit-test" : "integration-test",
      ),
      NODE_ENV: "test",
    },
    output,
  );
}

// Composition root. Normal development is local; providers are opt-in.
export async function runDevelopment(args = process.argv.slice(2)) {
  let command: DevelopmentCommand | undefined;
  try {
    command = parseCommand(args);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  if (!command) return 0;
  const root = process.cwd();
  // Parse first: --help/invalid arguments must not load files or acquire resources.
  // Provider tests use local development config; ordinary unit tests use test files.
  let env: Environment;
  try {
    env = await loadDevelopmentEnvironment(
      root,
      command.kind === "unit-test" ? "test" : "development",
    );
  } catch {
    console.error("Could not load environment files.");
    return 1;
  }
  const abort = new AbortController();
  let signalExit = 0;
  const removeSignals = (
    [
      ["SIGINT", 130],
      ["SIGTERM", 143],
    ] as const
  ).map(([signal, code]) => {
    const interrupt = () => {
      signalExit = code;
      abort.abort(new Error("Interrupted"));
    };
    process.on(signal, interrupt);
    return () => process.off(signal, interrupt);
  });
  const interrupted = new Promise<never>((_, reject) =>
    abort.signal.addEventListener(
      "abort",
      () => reject(new Error("Interrupted")),
      { once: true },
    ),
  );
  void interrupted.catch(() => {});
  const runner = createProcessRunner(root);
  let integration: Awaited<ReturnType<typeof startIntegration>> | undefined;
  let emulator: Awaited<ReturnType<typeof startEmulator>> | undefined;
  let exitCode = 0;

  async function runLocal(command: DevelopmentCommand) {
    const remote =
      command.kind === "integrated-dev" || command.kind === "integrated-test";
    const appInstance =
      command.kind === "unit-test"
        ? undefined
        : await localAppInstance(root, env.QUANTILE_APP_INSTANCE);
    const config = remote
      ? readIntegrationConfig(env, appInstance as string)
      : undefined;
    const portInput =
      "port" in command ? (command.port ?? env.PORT ?? "3000") : "3000";
    const port =
      command.kind === "integrated-test" ? await freePort() : Number(portInput);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("Invalid port.");
    // Always own an isolated unit-test emulator. Explicit local dev emulators
    // are permitted only for the demo project, never an inherited cloud target.
    if (command.kind !== "unit-test" && env.FIRESTORE_EMULATOR_HOST) {
      validateFirestoreConfig({
        projectId: env.GCP_PROJECT_ID ?? "",
        emulatorHost: env.FIRESTORE_EMULATOR_HOST,
      });
      if (env.GCP_PROJECT_ID !== "demo-quantile")
        throw new Error(
          "Local development requires the demo-quantile Firestore emulator, never a cloud database.",
        );
    } else {
      emulator = await startEmulator({
        root,
        environment: env,
        start: runner.start,
        signal: abort.signal,
      });
      env.FIRESTORE_EMULATOR_HOST = emulator.host;
    }
    env = {
      ...env,
      GCP_PROJECT_ID: "demo-quantile",
      STRIPE_EVENT_LIVEMODE: "false",
    };
    const unavailable = [
      interrupted,
      ...(emulator
        ? [
            emulator.child.done.then(() => {
              throw new Error("Firestore emulator stopped.");
            }),
          ]
        : []),
    ];
    for (const pending of unavailable) void pending.catch(() => {});
    if (command.kind === "unit-test") {
      exitCode = await Promise.race([
        startTests(root, runner.start, env, "unit").done,
        ...unavailable,
      ]);
    } else {
      env.QUANTILE_APP_INSTANCE = appInstance;
      env.PORT = String(port);
      if (config) {
        let ngrokConfig: string;
        try {
          const { stdout } = await promisify(execFile)(
            "ngrok",
            [
              "config",
              "check",
              ...(env.NGROK_CONFIG ? ["--config", env.NGROK_CONFIG] : []),
            ],
            {
              timeout: 5000,
              env: childEnvironment(env, "tools") as NodeJS.ProcessEnv,
            },
          );
          ngrokConfig =
            stdout.match(/Valid configuration file at (.+)/)?.[1]?.trim() ?? "";
          if (!ngrokConfig) throw new Error("No config path");
        } catch {
          throw new Error(
            "ngrok config check failed. Authenticate the installed ngrok CLI first (or provide NGROK_CONFIG). No token needs to be copied into this project.",
          );
        }
        const owner = await acquireOwner(root, appInstance as string);
        integration = await startIntegration({
          root,
          config,
          environment: env,
          owner,
          appPort: port,
          resendPort: await freePort(),
          start: runner.start,
          registry: resendRegistry(config.managementKey),
          signal: abort.signal,
          ngrokConfig,
        });
        env = {
          ...env,
          STRIPE_WEBHOOK_SECRET: integration.stripeSecret,
          RESEND_WEBHOOK_SECRET: integration.resendSecret,
          QUANTILE_STRIPE_WEBHOOK_URL: integration.target,
        };
        unavailable.push(
          integration.done.then(() => {
            throw new Error(
              "A webhook listener stopped. Restart integration; do not continue tests without it.",
            );
          }),
        );
      }
      const app = runner.start(
        "Next.js",
        process.execPath,
        [
          path.join(root, "node_modules/next/dist/bin/next"),
          "dev",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        childEnvironment(env, "runtime"),
        output,
      );
      console.info(
        `App instance: ${appInstance}. Integration ${remote ? "enabled" : "off"}.`,
      );
      if (command.kind === "integrated-test") {
        const readiness = new AbortController();
        try {
          await Promise.race([
            until(
              async () => {
                try {
                  return (
                    (
                      await fetch(`http://127.0.0.1:${port}`, {
                        signal: AbortSignal.timeout(2000),
                      })
                    ).ok || undefined
                  );
                } catch {
                  return undefined;
                }
              },
              "Next.js",
              AbortSignal.any([abort.signal, readiness.signal]),
              90_000,
            ),
            app.done.then(() => {
              throw new Error("Next.js stopped before integration tests.");
            }),
            ...unavailable,
          ]);
        } finally {
          readiness.abort();
        }
        exitCode = await Promise.race([
          startTests(root, runner.start, env, "integration").done,
          app.done.then(() => {
            throw new Error("Next.js stopped during integration tests.");
          }),
          ...unavailable,
        ]);
      } else exitCode = await Promise.race([app.done, ...unavailable]);
    }
  }
  try {
    if (env.QUANTILE_STRIPE_WEBHOOK_URL)
      throw new Error(
        "QUANTILE_STRIPE_WEBHOOK_URL is internal. Use pnpm test:integration --target <url>.",
      );
    if (command.kind === "cleanup") {
      const owner = await readOwner(root);
      if (ownerIsRunning(owner))
        throw new Error(
          "The integration owner process still exists. Stop it before cleanup; never kill a PID based solely on a stale journal.",
        );
      await cleanupOwner(
        root,
        owner,
        resendRegistry(env.RESEND_MANAGEMENT_API_KEY ?? ""),
      );
      console.info(
        "Owned Resend registrations cleaned up. Check for orphaned CLI processes on this host.",
      );
    } else if (command.kind === "target-test") {
      validateTargetInputs(env);
      env.QUANTILE_STRIPE_WEBHOOK_URL = command.target;
      exitCode = await Promise.race([
        startTests(root, runner.start, env, "integration").done,
        interrupted,
      ]);
    } else {
      await runLocal(command);
    }
  } catch (error) {
    if (!signalExit)
      console.error(
        error instanceof Error ? error.message : "Local lifecycle failed.",
      );
    exitCode = signalExit || 1;
  } finally {
    // One process owner, reverse shutdown, then verified provider/journal cleanup.
    for (const cleanup of [
      () => runner.stop(),
      () => integration?.stop(),
      () => emulator?.close(),
    ]) {
      try {
        await cleanup();
      } catch {
        console.error(
          "Cleanup could not be confirmed. Inspect this lifecycle's processes and .quantile/ ownership before restarting.",
        );
        exitCode ||= 1;
      }
    }
    for (const remove of removeSignals) remove();
  }
  return signalExit || exitCode;
}
