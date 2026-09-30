import { randomBytes, randomUUID } from "node:crypto";
import {
  access,
  link,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import { z } from "zod";
import { belongsToAppInstance, parseAppInstance } from "../app/instance.ts";

export type ResendEndpoint = {
  id: string;
  endpoint: string;
  events: string[];
  signing_secret?: string;
};
export type ResendRegistry = {
  find: (url: string) => Promise<ResendEndpoint[]>;
  get: (id: string) => Promise<ResendEndpoint | null>;
  remove: (id: string) => Promise<void>;
};

export type IntegrationOwner = {
  version: 2;
  appInstance: string;
  token: string;
  pid: number;
  host: string;
  startedAt: string;
  mode: "test";
  endpoint?: string;
  resendId?: string;
};
// Publish a complete file atomically. Opening the destination with "wx" and
// then writing leaves a window where another process can read an empty file.
async function publish(file: string, value: string) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, { flag: "wx", mode: 0o600 });
    await link(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function localAppInstance(root: string, configured?: string) {
  if (configured) return parseAppInstance(configured);
  const directory = path.join(root, ".quantile");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, "app-instance");
  try {
    await publish(file, `app-${randomBytes(8).toString("hex")}\n`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return parseAppInstance((await readFile(file, "utf8")).trim());
}

const ownerSchema = z.object({
  version: z.literal(2),
  mode: z.literal("test"),
  appInstance: z.string(),
  token: z.string(),
  pid: z.number().int().positive(),
  host: z.string().min(1),
  startedAt: z.string().datetime(),
  endpoint: z.string().optional(),
  resendId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,128}$/)
    .optional(),
});

export function assertOwner(owner: IntegrationOwner) {
  if (
    !ownerSchema.safeParse(owner).success ||
    !belongsToAppInstance(owner.appInstance, owner.token)
  )
    throw new Error(
      "Invalid integration ownership record; inspect it manually.",
    );
  if (owner.endpoint !== undefined) {
    if (typeof owner.endpoint !== "string")
      throw new Error("Invalid integration endpoint.");
    const url = new URL(owner.endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== `/api/resend/webhook/${owner.token}`
    )
      throw new Error(
        "Refusing cleanup: endpoint does not belong to this integration lifecycle.",
      );
  } else if (owner.resendId)
    throw new Error("Refusing cleanup without the owned endpoint URL.");
}

export async function acquireOwner(root: string, appInstance: string) {
  const directory = path.join(root, ".quantile");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, "webhooks.json");
  try {
    await access(path.join(directory, "webhooks-cleanup"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return createOwner(file, appInstance);
  }
  throw new Error(
    "Integration cleanup is active or was interrupted. Inspect .quantile/webhooks-cleanup before starting another lifecycle.",
  );
}

async function createOwner(file: string, appInstance: string) {
  const owner: IntegrationOwner = {
    version: 2,
    mode: "test",
    appInstance,
    token: `${appInstance}-${randomUUID().replaceAll("-", "")}`,
    pid: process.pid,
    host: hostname(),
    startedAt: new Date().toISOString(),
  };
  assertOwner(owner);
  try {
    await publish(file, `${JSON.stringify(owner, null, 2)}\n`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        "This checkout already has an integration owner. Inspect .quantile/webhooks.json; after its process stops, use pnpm dev --cleanup-integration.",
      );
    throw error;
  }
  return owner;
}

export async function saveOwner(root: string, owner: IntegrationOwner) {
  assertOwner(owner);
  const file = path.join(root, ".quantile/webhooks.json");
  const current = await readOwner(root);
  if (current.token !== owner.token)
    throw new Error("Integration ownership changed; refusing to overwrite it.");
  const temporary = `${file}.${owner.token}.tmp`;
  await writeFile(temporary, `${JSON.stringify(owner, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, file);
}

export async function readOwner(root: string) {
  const content = await readFile(
    path.join(root, ".quantile/webhooks.json"),
    "utf8",
  );
  try {
    const owner = JSON.parse(content) as IntegrationOwner;
    assertOwner(owner);
    return owner;
  } catch {
    // JSON parse errors can quote file contents. Never echo journal contents.
    throw new Error(
      "Invalid integration ownership record; inspect it manually.",
    );
  }
}

export function ownerIsRunning(owner: IntegrationOwner) {
  if (owner.host !== hostname())
    throw new Error(
      "Ownership record is from another host. Confirm that run has stopped before cleanup.",
    );
  try {
    process.kill(owner.pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw new Error("Cannot confirm the integration process has stopped.");
  }
}

export async function cleanupOwner(
  root: string,
  owner: IntegrationOwner,
  registry: ResendRegistry,
) {
  assertOwner(owner);
  // Serializes cleanup callers, not different checkouts or ordinary tests.
  // Do not automatically evict an interrupted cleanup lock: its process and
  // provider outcome must be investigated before the guard can be removed.
  const guard = path.join(root, ".quantile/webhooks-cleanup");
  try {
    await mkdir(guard, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        "Integration cleanup is active or was interrupted. Inspect .quantile/webhooks-cleanup before retrying.",
      );
    throw error;
  }
  try {
    await writeFile(
      path.join(guard, "owner.json"),
      JSON.stringify({
        token: owner.token,
        pid: process.pid,
        host: hostname(),
      }),
      { flag: "wx", mode: 0o600 },
    );
    const current = await readOwner(root);
    if (current.token !== owner.token)
      throw new Error("Refusing to clean another integration lifecycle.");
    if (
      current.host !== hostname() ||
      (current.pid !== process.pid && ownerIsRunning(current))
    )
      throw new Error(
        "Refusing cleanup of another host or a running integration owner.",
      );
    // A crash can happen after registration but before ID capture. The exact
    // unique URL was journaled BEFORE starting Resend CLI.
    const endpoints = current.endpoint
      ? current.resendId
        ? [await registry.get(current.resendId)].filter(
            (v): v is ResendEndpoint => v !== null,
          )
        : await registry.find(current.endpoint)
      : [];
    for (const endpoint of endpoints) {
      if (
        (current.resendId && endpoint.id !== current.resendId) ||
        endpoint.endpoint !== current.endpoint ||
        endpoint.events.length !== 1 ||
        endpoint.events[0] !== "email.sent"
      )
        throw new Error(
          "Refusing to delete an endpoint whose ownership or subscriptions changed.",
        );
    }
    for (const endpoint of endpoints) {
      await registry.remove(endpoint.id);
      if (await registry.get(endpoint.id))
        throw new Error("Resend endpoint deletion was not confirmed.");
    }
    if ((await readOwner(root)).token !== current.token)
      throw new Error("Integration ownership changed during cleanup.");
    // Remove the overlay BEFORE releasing ownership. A newly started run must
    // never lose its config to a previous run's delayed cleanup.
    await rm(path.join(root, ".quantile/ngrok.yml"), { force: true });
    await rm(path.join(root, ".quantile/webhooks.json"));
  } finally {
    await rm(guard, { recursive: true, force: true });
  }
}
