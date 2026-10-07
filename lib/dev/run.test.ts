import { type ChildProcess, spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readIntegrationTarget } from "../stripe/test.ts";
import { childEnvironment } from "./process.ts";
import { parseCommand, readIntegrationConfig } from "./run.ts";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "quantile-lifecycle-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
const env = {
  STRIPE_EVENT_LIVEMODE: "false",
  STRIPE_TEST_API_KEY: "rk_test_fixture",
  RESEND_MANAGEMENT_API_KEY: "re_fixture_inspect",
  RESEND_API_KEY: "re_fixture_send",
  STRIPE_PRICE_ID: "price_fixture",
  QUANTILE_EMAIL_FROM: "sample@example.com",
  QUANTILE_EMAIL_REPLY_TO: "sample@example.com",
};
describe("integration configuration and process boundaries", () => {
  it("normalizes each supported command without starting resources", () => {
    expect(parseCommand([])).toEqual({ kind: "dev", port: undefined });
    expect(parseCommand(["--integration", "--port", "3100"])).toEqual({
      kind: "integrated-dev",
      port: "3100",
    });
    expect(parseCommand(["--test"])).toEqual({ kind: "unit-test" });
    expect(parseCommand(["--test", "--integration"])).toEqual({
      kind: "integrated-test",
    });
    expect(
      parseCommand([
        "--test",
        "--integration",
        "--target",
        "https://example.com/api/stripe/webhook",
      ]),
    ).toEqual({
      kind: "target-test",
      target: "https://example.com/api/stripe/webhook",
    });
    expect(parseCommand(["--cleanup-integration"])).toEqual({
      kind: "cleanup",
    });
    expect(() => parseCommand(["--unexpected=private"])).toThrow(
      "Invalid arguments. Use pnpm dev --help.",
    );
  });
  it("requires explicit nonlive mode and a test key", () => {
    expect(() =>
      readIntegrationConfig(
        { ...env, STRIPE_EVENT_LIVEMODE: "true" },
        "sample",
      ),
    ).toThrow();
    expect(() =>
      readIntegrationConfig(
        { ...env, STRIPE_TEST_API_KEY: "sk_live_fixture" },
        "sample",
      ),
    ).toThrow();
    expect(readIntegrationConfig(env, "sample")).toMatchObject({
      origin: undefined,
      stripeKey: env.STRIPE_TEST_API_KEY,
      managementKey: env.RESEND_MANAGEMENT_API_KEY,
    });
    expect(
      readIntegrationConfig(
        { ...env, NGROK_URL: "https://{appInstance}.example.com" },
        "sample",
      ),
    ).toMatchObject({ origin: "https://sample.example.com" });
  });
  it.each([
    "true",
    "test",
    "live",
    "TRUE",
    "1",
    "0",
  ])("rejects invalid STRIPE_EVENT_LIVEMODE=%s", (value) => {
    expect(() =>
      readIntegrationConfig({ ...env, STRIPE_EVENT_LIVEMODE: value }, "sample"),
    ).toThrow();
  });
  it.each(Object.keys(env))("requires %s before startup", (key) => {
    expect(() =>
      readIntegrationConfig({ ...env, [key]: undefined }, "sample"),
    ).toThrow();
  });
  it.each([
    { RESEND_MANAGEMENT_API_KEY: "invalid" },
    { RESEND_API_KEY: "invalid" },
    { STRIPE_PRICE_ID: "not-a-price" },
  ])("rejects invalid provider settings", (invalid) => {
    expect(() =>
      readIntegrationConfig({ ...env, ...invalid }, "sample"),
    ).toThrow();
  });
  it.each([
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com?q=secret",
  ])("rejects unsafe tunnel %s", (url) => {
    expect(() =>
      readIntegrationConfig({ ...env, NGROK_URL: url }, "sample"),
    ).toThrow();
  });
  it.each([
    "https://example.com/api/stripe/webhook",
    "http://127.0.0.1:3000/api/stripe/webhook",
  ])("accepts explicit target %s", (url) => {
    expect(readIntegrationTarget(url)).toBe(url);
  });
  it.each([
    "invalid",
    "http://example.com/api/stripe/webhook",
    "https://user:pass@example.com/api/stripe/webhook",
    "https://example.com/api/stripe/webhook?secret=x",
    "https://example.com/other",
  ])("rejects unsafe target without quoting it", (url) => {
    expect(() => readIntegrationTarget(url)).toThrow();
  });
  it("passes only each child's required settings and masks excluded dotenv values", () => {
    const full = {
      ...env,
      GCP_PROJECT_ID: "demo-quantile",
      FIRESTORE_EMULATOR_HOST: "localhost:8080",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      RESEND_WEBHOOK_SECRET: "whsec_y",
      PATH: "/bin",
      CUSTOM_TOOL_CONFIG: "tool-value",
      XDG_CACHE_HOME: "/normal-cache",
      GOOGLE_APPLICATION_CREDENTIALS: "/credential",
    };
    const app = childEnvironment(full, "runtime");
    expect(app.RESEND_API_KEY).toBe(env.RESEND_API_KEY);
    expect(app.STRIPE_TEST_API_KEY).toBe("");
    expect(app.RESEND_MANAGEMENT_API_KEY).toBe("");
    expect(app.CUSTOM_TOOL_CONFIG).toBe("tool-value");
    expect(app.XDG_CACHE_HOME).toBe("/normal-cache");
    const tests = childEnvironment(full, "integration-test");
    expect(tests.RESEND_API_KEY).toBe("");
    expect(tests.RESEND_WEBHOOK_SECRET).toBe("");
    expect(tests.RESEND_MANAGEMENT_API_KEY).toBe(env.RESEND_MANAGEMENT_API_KEY);
    const unit = childEnvironment(full, "unit-test");
    expect(unit.GOOGLE_APPLICATION_CREDENTIALS).toBe("");
    expect(unit.STRIPE_TEST_API_KEY).toBe("");
    expect(childEnvironment(full, "tools")).toMatchObject({
      PATH: "/bin",
      CUSTOM_TOOL_CONFIG: "tool-value",
      XDG_CACHE_HOME: "/normal-cache",
    });
    expect(childEnvironment(full, "tools").RESEND_API_KEY).toBeUndefined();
  });
});

describe("development command processes", () => {
  const entrypoint = fileURLToPath(
    new URL("../../scripts/dev.ts", import.meta.url),
  );
  const running: {
    process: ChildProcess;
    exit: () => Promise<number | null>;
  }[] = [];
  // Inert subprocess fixtures exercise actual signals/process groups; no provider calls.
  beforeEach(async () => {
    const files = {
      "node_modules/firebase-tools/lib/bin/firebase.js": `
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
const config = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--config') + 1], 'utf8'));
fs.writeFileSync('emulator.started', JSON.stringify(config));
if (fixture.emulator === 'fail') { console.error('sensitive-provider-output'); process.exit(7); }
process.on('SIGTERM', () => { fs.writeFileSync('emulator.stopped', 'yes'); process.exit(0); });
setTimeout(() => process.exit(98), 12000);
if (fixture.emulator !== 'wait') console.log('All emulators ready');
`,
      "node_modules/next/dist/bin/next": `
const fs = require('node:fs');
try { process.loadEnvFile('.env.local'); } catch {}
fs.writeFileSync('next.started', JSON.stringify({ instance: process.env.QUANTILE_APP_INSTANCE, port: process.env.PORT, management: process.env.RESEND_MANAGEMENT_API_KEY, stripe: process.env.STRIPE_TEST_API_KEY }));
process.on('SIGTERM', () => { fs.writeFileSync('next.stopped', 'yes'); process.exit(0); });
setTimeout(() => process.exit(98), 12000);
`,
      "node_modules/vitest/vitest.mjs": `
import { writeFileSync, readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('fixture.json', 'utf8'));
writeFileSync('tests.started', JSON.stringify({ args: process.argv.slice(2), mode: process.env.STRIPE_EVENT_LIVEMODE, project: process.env.GCP_PROJECT_ID, host: process.env.FIRESTORE_EMULATOR_HOST, instance: process.env.QUANTILE_APP_INSTANCE, target: process.env.QUANTILE_STRIPE_WEBHOOK_URL, sendingKey: process.env.RESEND_API_KEY, googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS }));
process.exit(fixture.exit ?? 0);
`,
    };
    for (const [file, content] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), content);
    }
    await writeFile(path.join(root, "fixture.json"), "{}");
  });
  afterEach(async () => {
    for (const child of running.splice(0)) {
      if (child.process.exitCode === null && child.process.signalCode === null)
        child.process.kill("SIGTERM");
      await child.exit();
    }
  });
  function startDevelopment(
    args: string[],
    variables: Record<string, string> = {},
  ) {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", entrypoint, ...args],
      {
        cwd: root,
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          HOME: root,
          SystemRoot: process.env.SystemRoot,
          ...variables,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    const done = new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    const result = {
      process: child,
      output: () => output,
      async exit() {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            done,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                child.kill("SIGKILL");
                reject(
                  new Error(
                    `Development command did not exit promptly: ${output}`,
                  ),
                );
              }, 6000);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      },
    };
    running.push(result);
    return result;
  }
  async function started(file: string) {
    await vi.waitFor(
      async () => {
        await access(path.join(root, file));
      },
      { timeout: 5000 },
    );
    return JSON.parse(await readFile(path.join(root, file), "utf8"));
  }
  async function absent(file: string) {
    await expect(access(path.join(root, file))).rejects.toMatchObject({
      code: "ENOENT",
    });
  }
  it("runs Next and the emulator, excludes management credentials even after dotenv reload, and stops on SIGTERM", async () => {
    await writeFile(
      path.join(root, ".env.local"),
      "RESEND_MANAGEMENT_API_KEY=re_private\nSTRIPE_TEST_API_KEY=rk_test_private\n",
    );
    const child = startDevelopment(["--port", "3101"], { PORT: "3102" });
    expect(await started("next.started")).toMatchObject({
      port: "3101",
      instance: expect.stringMatching(/^app-[a-f0-9]{16}$/),
      management: "",
      stripe: "",
    });
    expect(child.output()).toContain("Integration off");
    expect((await started("emulator.started")).emulators.firestore.host).toBe(
      "127.0.0.1",
    );
    await absent("tests.started");
    await absent(".quantile/webhooks.json");
    child.process.kill("SIGTERM");
    expect(await child.exit()).toBe(143);
    expect(await readFile(path.join(root, "next.stopped"), "utf8")).toBe("yes");
    expect(await readFile(path.join(root, "emulator.stopped"), "utf8")).toBe(
      "yes",
    );
  });
  it("loads Next development file precedence and expansion", async () => {
    await writeFile(path.join(root, ".env"), "PORT=3100\n");
    await writeFile(path.join(root, ".env.local"), "PORT=3101\n");
    await writeFile(
      path.join(root, ".env.development.local"),
      "BASE_PORT=3103\nPORT=$BASE_PORT\n",
    );
    const child = startDevelopment([]);
    expect((await started("next.started")).port).toBe("3103");
    child.process.kill("SIGTERM");
    expect(await child.exit()).toBe(143);
  });
  it("keeps inherited environment above files and CLI above environment", async () => {
    await writeFile(path.join(root, ".env.local"), "PORT=3101\n");
    const child = startDevelopment([], { PORT: "3102" });
    expect((await started("next.started")).port).toBe("3102");
    child.process.kill("SIGTERM");
    expect(await child.exit()).toBe(143);
  });
  it("shows help without loading configuration or starting infrastructure", async () => {
    await mkdir(path.join(root, ".env.local"));
    const child = startDevelopment(["--help"]);
    expect(await child.exit()).toBe(0);
    expect(child.output()).toContain("--integration");
    await absent(".quantile");
  });
  it("unit tests do not load private development credentials", async () => {
    await writeFile(
      path.join(root, ".env.local"),
      "QUANTILE_STRIPE_WEBHOOK_URL=https://should-not-load.example\nRESEND_API_KEY=re_private\n",
    );
    const child = startDevelopment(["--test"]);
    expect(await child.exit()).toBe(0);
    expect((await started("tests.started")).sendingKey).toBe("");
  });
  it("overrides production config for unit tests and strips cloud/provider credentials", async () => {
    await writeFile(
      path.join(root, "fixture.json"),
      JSON.stringify({ exit: 7 }),
    );
    const child = startDevelopment(["--test"], {
      STRIPE_EVENT_LIVEMODE: "true",
      GCP_PROJECT_ID: "not-a-test-project",
      GOOGLE_APPLICATION_CREDENTIALS: "/private",
      RESEND_API_KEY: "re_private",
    });
    expect(await child.exit()).toBe(7);
    expect(await started("tests.started")).toMatchObject({
      args: ["--project=unit", "--project=storybook", "--run"],
      mode: "false",
      project: "demo-quantile",
      host: expect.stringMatching(/^127\.0\.0\.1:\d+$/),
      googleCredentials: "",
      sendingKey: "",
    });
    expect((await started("emulator.started")).emulators.ui.enabled).toBe(
      false,
    );
    expect(await readFile(path.join(root, "emulator.stopped"), "utf8")).toBe(
      "yes",
    );
    expect(await readdir(path.join(root, ".quantile"))).toEqual([]);
    await absent("next.started");
  });
  it("cleans failed emulator startup without quoting provider output", async () => {
    await writeFile(
      path.join(root, "fixture.json"),
      JSON.stringify({ emulator: "fail" }),
    );
    const child = startDevelopment(["--test"]);
    expect(await child.exit()).toBe(1);
    expect(child.output()).toContain("Firestore emulator exited");
    expect(child.output()).not.toContain("sensitive-provider-output");
    expect(await readdir(path.join(root, ".quantile"))).toEqual([]);
    await absent("tests.started");
  });
  it("interrupts readiness and removes emulator configuration", async () => {
    await writeFile(
      path.join(root, "fixture.json"),
      JSON.stringify({ emulator: "wait" }),
    );
    const child = startDevelopment(["--test"]);
    await started("emulator.started");
    child.process.kill("SIGINT");
    expect(await child.exit()).toBe(130);
    expect(await readFile(path.join(root, "emulator.stopped"), "utf8")).toBe(
      "yes",
    );
    expect(await readdir(path.join(root, ".quantile"))).toEqual([]);
  });
  it("uses an explicit caller-owned integration target without starting infrastructure", async () => {
    const target = "https://owned.example.com/api/stripe/webhook";
    const child = startDevelopment(
      ["--test", "--integration", "--target", target],
      {
        ...env,
        QUANTILE_APP_INSTANCE: "owned",
        GCP_PROJECT_ID: "sample-project",
        STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      },
    );
    expect(await child.exit()).toBe(0);
    expect(await started("tests.started")).toMatchObject({
      args: ["--project=integration", "--run"],
      target,
      instance: "owned",
      mode: "false",
      project: "sample-project",
      sendingKey: "",
    });
    await absent("emulator.started");
    await absent("next.started");
    await absent(".quantile");
  });
  it.each([
    ["--integration"],
    ["--test", "--integration"],
  ])("rejects live integration for manual or automated use: %o", async (...args) => {
    const child = startDevelopment(args, {
      STRIPE_EVENT_LIVEMODE: "true",
      STRIPE_TEST_API_KEY: "sk_live_fixture",
    });
    expect(await child.exit()).toBe(1);
    expect(child.output()).toContain("live mode is forbidden");
    await absent("emulator.started");
    await absent("next.started");
    await absent(".quantile/webhooks.json");
  });
  it("does not use an ambient URL to change integration ownership", async () => {
    const child = startDevelopment(["--test", "--integration"], {
      QUANTILE_STRIPE_WEBHOOK_URL:
        "https://owned.example.com/api/stripe/webhook",
    });
    expect(await child.exit()).toBe(1);
    expect(child.output()).toContain("is internal");
    await absent(".quantile");
    await absent("tests.started");
  });
  it.each([
    ["--test", "--port", "3100"],
    ["--integration", "--target", "https://example.com/api/stripe/webhook"],
    ["--cleanup-integration", "--integration"],
  ])("rejects incompatible arguments %o before starting children", async (...args) => {
    const child = startDevelopment(args);
    expect(await child.exit()).toBe(1);
    expect(child.output()).toContain("Incompatible arguments");
    await absent("emulator.started");
    await absent("next.started");
    await absent("tests.started");
  });
});
