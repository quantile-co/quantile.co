import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";

export type Environment = Record<string, string | undefined>;
export type Child = { done: Promise<number>; stop: () => Promise<void> };
export type Start = (
  name: string,
  command: string,
  args: string[],
  env: Environment,
  line?: (text: string) => void,
) => Child;

// Inherit the OS/tool environment normally. Only scope credentials this launcher
// manages. Empty values prevent Next/dotenv from reloading excluded credentials.
const credentials = [
  "STRIPE_API_KEY",
  "STRIPE_TEST_API_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_MANAGEMENT_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_QUOTA_PROJECT",
];
export function childEnvironment(
  env: Environment,
  purpose: "tools" | "runtime" | "integration-test" | "unit-test",
): Environment {
  const result = { ...env };
  const allowed =
    purpose === "runtime"
      ? ["STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET"]
      : purpose === "integration-test"
        ? [
            "STRIPE_TEST_API_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "RESEND_MANAGEMENT_API_KEY",
            "GOOGLE_APPLICATION_CREDENTIALS",
            "GOOGLE_CLOUD_QUOTA_PROJECT",
          ]
        : [];
  for (const key of credentials) {
    if (allowed.includes(key)) continue;
    if (purpose === "tools") delete result[key];
    else result[key] = "";
  }
  return result;
}

export function createProcessRunner(root: string) {
  const children: Child[] = [];
  const start: Start = (name, command, args, env, line) => {
    const child = spawn(command, args, {
      cwd: root,
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    let stopped = false;
    let finished = false;
    let problem = "";
    const done = new Promise<number>((resolve) => {
      child.once("error", () => {
        problem = `${name} could not start. Check that it is installed and executable.`;
        finished = true;
        resolve(1);
      });
      child.once("close", (code) => {
        finished = true;
        resolve(code ?? 1);
      });
    }).then((code) => {
      if (code !== 0 && !stopped)
        console.error(
          problem ||
            `${name} failed (exit ${code}). Check configuration, credentials and available provider capacity.`,
        );
      return code;
    });
    for (const stream of [child.stdout, child.stderr]) {
      if (!stream) continue;
      const reader = createInterface({ input: stream });
      reader.on("line", (text) => {
        if (/too many.*sessions|rate.limit|quota|maximum.*webhooks/i.test(text))
          problem = `${name}: provider capacity/rate limit reached. Inspect owned registrations; no other lifecycle will be evicted.`;
        const ngrokCode = text.match(/\bERR_NGROK_[A-Z0-9_]+\b/)?.[0];
        if (ngrokCode)
          problem = `ngrok failed (${ngrokCode}). Check the configured URL, account permissions and plan capacity.`;
        // Provider output can contain secrets/payloads. Only the supplied callback
        // may consume it; roots opt in to forwarding ordinary app/test output.
        line?.(text);
      });
    }
    const result: Child = {
      done,
      async stop() {
        if (finished) return;
        stopped = true;
        const kill = (signal: NodeJS.Signals) => {
          try {
            if (child.pid)
              process.kill(
                process.platform === "win32" ? child.pid : -child.pid,
                signal,
              );
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
        };
        kill("SIGTERM");
        let timer: ReturnType<typeof setTimeout> | undefined;
        const escalation = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            try {
              kill("SIGKILL");
            } catch {
              reject(new Error("Could not stop child process."));
            }
          }, 10_000);
        });
        try {
          await Promise.race([done, escalation]);
        } finally {
          clearTimeout(timer);
        }
      },
    };
    children.push(result);
    return result;
  };
  return { start, stop: () => stopChildren(children) };
}

export async function stopChildren(children: Child[]) {
  let failed = false;
  for (const child of [...children].reverse()) {
    try {
      await child.stop();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("Could not stop all local child processes.");
}

export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not allocate a local port.");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

export async function until<T>(
  check: () => Promise<T | undefined>,
  label: string,
  signal: AbortSignal,
  timeout = 45_000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    const value = await check();
    if (value !== undefined) return value;
    await delay(500, undefined, { signal });
  }
  throw new Error(
    `Timed out starting ${label}. Check credentials, connectivity and available listener/endpoint capacity.`,
  );
}
