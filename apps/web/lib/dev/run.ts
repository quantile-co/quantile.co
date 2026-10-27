import path from "node:path";
import { Command, CommanderError, Option } from "commander";
import Stripe from "stripe";
import {
  loadDevelopmentEnvironment,
  readDevelopmentPortalUrl,
  readIntegrationSettings,
  readTargetSettings,
  resolveFirestoreSettings,
} from "../env/env.ts";
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
  developmentAppInstance,
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
  readTargetSettings(env);
}

type DevelopmentCommand =
  | { kind: "dev" | "integrated-dev"; port?: string }
  | { kind: "unit-test" | "integrated-test" | "cleanup" }
  | { kind: "target-test"; target: string };
export function parseCommand(args: string[]): DevelopmentCommand | undefined {
  const cli = new Command()
    .name("dev")
    .description(
      "Development application and Firestore emulator; --integration adds remote providers.",
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
    throw new Error("Invalid development arguments.");
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
      ...(project === "unit"
        ? ["--project=storybook", "--project=browser"]
        : []),
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

export async function discoverDevelopmentPortal(key: string) {
  if (!/^(rk|sk)_test_/.test(key))
    throw new Error("Portal discovery requires a development billing key.");
  try {
    const stripe = new Stripe(key, { timeout: 20_000, maxNetworkRetries: 0 });
    const defaults: Stripe.BillingPortal.Configuration[] = [];
    for await (const config of stripe.billingPortal.configurations.list({
      active: true,
      limit: 100,
    })) {
      if (config.is_default) defaults.push(config);
    }
    const config = defaults[0];
    if (
      defaults.length !== 1 ||
      !config?.active ||
      config.livemode ||
      !config.login_page?.enabled ||
      !config.login_page.url
    )
      throw new Error();
    return readDevelopmentPortalUrl({
      STRIPE_EVENT_LIVEMODE: "false",
      QUANTILE_DEVELOPMENT_PORTAL_URL: config.login_page.url,
    }) as string;
  } catch {
    throw new Error(
      "Could not discover the default development billing portal. Check its login link and the development key's portal read permission.",
    );
  }
}

// Composition root. Development provider connections are opt-in.
export async function runDevelopment(
  args: string[],
  discoverPortal = discoverDevelopmentPortal,
) {
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
  // Provider tests use development config; ordinary unit tests use test files.
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

  async function runDevelopmentCommand(command: DevelopmentCommand) {
    const remote =
      command.kind === "integrated-dev" || command.kind === "integrated-test";
    const appInstance =
      command.kind === "unit-test"
        ? undefined
        : await developmentAppInstance(root, env.QUANTILE_APP_INSTANCE);
    const config = remote
      ? readIntegrationConfig(env, appInstance as string)
      : undefined;
    const portInput =
      "port" in command ? (command.port ?? env.PORT ?? "3000") : "3000";
    const port =
      command.kind === "integrated-test" ? await freePort() : Number(portInput);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("Invalid port.");
    // Always own an isolated unit-test emulator. Explicit development emulators
    // are permitted only for the demo project, never an inherited cloud target.
    if (command.kind !== "unit-test" && env.FIRESTORE_EMULATOR_HOST) {
      resolveFirestoreSettings({
        projectId: env.GCP_PROJECT_ID ?? "",
        emulatorHost: env.FIRESTORE_EMULATOR_HOST,
      });
      if (env.GCP_PROJECT_ID !== "demo-quantile")
        throw new Error(
          "Development requires the demo-quantile Firestore emulator, never a cloud database.",
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
      env.QUANTILE_SITE_ORIGIN = `http://127.0.0.1:${port}`;
      // Only launcher-owned tests may start Checkout against this process.
      if (command.kind === "integrated-test")
        env.QUANTILE_CHECKOUT_TEST_ORIGIN = env.QUANTILE_SITE_ORIGIN;
      // The ordinary dev server has no provider access. Integrated dev uses
      // exactly the validated development key, never an ambient production key.
      env.STRIPE_API_KEY = config?.stripeKey ?? "";
      if (config) {
        // Discover once, before compilation. No page request needs provider access.
        env.QUANTILE_DEVELOPMENT_PORTAL_URL = await Promise.race([
          discoverPortal(config.stripeKey),
          ...unavailable,
        ]);
      }
      if (command.kind === "integrated-test") {
        // Exercise the production build and browser policy with development
        // billing and the isolated emulator. Never publish analytics.
        env.NODE_ENV = "production";
        env.NEXT_PUBLIC_FATHOM_SITE_ID = "";
        env.NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS = "";
        const build = runner.start(
          "Next.js build",
          process.execPath,
          [path.join(root, "node_modules/next/dist/bin/next"), "build"],
          childEnvironment(env, "unit-test"),
          output,
        );
        const result = await Promise.race([build.done, ...unavailable]);
        if (result !== 0)
          throw new Error("Production build for development billing failed.");
      }
      if (config) {
        const owner = await acquireOwner(root, appInstance as string);
        integration = await startIntegration({
          root,
          config,
          environment: env,
          owner,
          appPort: port,
          start: runner.start,
          registry: resendRegistry(config.managementKey),
          signal: abort.signal,
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
          command.kind === "integrated-test" ? "start" : "dev",
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
        "QUANTILE_STRIPE_WEBHOOK_URL is internal. Supply a target for integration tests.",
      );
    if (env.QUANTILE_CHECKOUT_TEST_ORIGIN)
      throw new Error("QUANTILE_CHECKOUT_TEST_ORIGIN is internal.");
    if (env.QUANTILE_DEVELOPMENT_PORTAL_URL !== undefined)
      throw new Error(
        "QUANTILE_DEVELOPMENT_PORTAL_URL is internal; the launcher discovers it.",
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
      await runDevelopmentCommand(command);
    }
  } catch (error) {
    if (!signalExit)
      console.error(
        error instanceof Error
          ? error.message
          : "Development lifecycle failed.",
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
