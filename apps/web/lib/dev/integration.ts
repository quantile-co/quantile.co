import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import {
  cleanupOwner,
  type IntegrationOwner,
  type ResendEndpoint,
  type ResendRegistry,
  saveOwner,
} from "./ownership.ts";
import {
  type Child,
  childEnvironment,
  type Environment,
  type Start,
  stopChildren,
  until,
} from "./process.ts";

type ReadTailscale = (args: string[]) => Promise<unknown>;
function tailscaleReader(environment: Environment): ReadTailscale {
  return async (args) => {
    try {
      const { stdout } = await promisify(execFile)("tailscale", args, {
        env: childEnvironment(environment, "tools") as NodeJS.ProcessEnv,
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      });
      return JSON.parse(stdout);
    } catch {
      // CLI errors may quote local configuration. Never forward their output.
      throw new Error(
        "Could not read Tailscale. Check the installed CLI, signed-in local daemon and operator permissions.",
      );
    }
  };
}

const serverSchema = z
  .object({
    TCP: z.record(z.string(), z.unknown()).optional(),
    Web: z
      .record(
        z.string(),
        z
          .object({
            Handlers: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      )
      .optional(),
    AllowFunnel: z.record(z.string(), z.boolean()).optional(),
    Foreground: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// Machine setup owns the persistent listener. This check never changes it.
export async function readFunnelOrigin(read: ReadTailscale) {
  const status = z
    .object({
      BackendState: z.literal("Running"),
      CurrentTailnet: z.object({ MagicDNSEnabled: z.literal(true) }),
      Self: z.object({
        DNSName: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+\.ts\.net\.?$/),
        CapMap: z.record(z.string(), z.unknown()),
      }),
    })
    .safeParse(await read(["status", "--json", "--peers=false"]));
  if (
    !status.success ||
    !Object.hasOwn(status.data.Self.CapMap, "https") ||
    !Object.hasOwn(status.data.Self.CapMap, "funnel")
  )
    throw new Error(
      "Integration requires a signed-in Tailscale daemon with MagicDNS, HTTPS and Funnel enabled.",
    );
  const hostname = status.data.Self.DNSName.replace(/\.$/, "");
  const hostPort = hostname + ":8443";
  const configuration = serverSchema.safeParse(
    await read(["serve", "status", "--json"]),
  );
  const setupError = () =>
    new Error(
      "Configure the dedicated background Funnel on HTTPS 8443 to 127.0.0.1:4318 as documented in README.md. Existing Serve/Funnel settings were not changed.",
    );
  if (!configuration.success) throw setupError();
  const config = configuration.data;
  const handlers = config.Web?.[hostPort]?.Handlers ?? {};
  const foreground = Object.values(config.Foreground ?? {}).map((c) =>
    serverSchema.safeParse(c),
  );
  if (
    !z
      .object({ HTTPS: z.literal(true) })
      .strict()
      .safeParse(config.TCP?.["8443"]).success ||
    Object.keys(config.Web ?? {}).filter((h) => h.endsWith(":8443")).length !==
      1 ||
    Object.keys(handlers).length !== 1 ||
    !z
      .object({ Proxy: z.literal("http://127.0.0.1:4318") })
      .strict()
      .safeParse(handlers["/api/resend/webhook/"]).success ||
    config.AllowFunnel?.[hostPort] !== true ||
    foreground.some(
      (c) =>
        !c.success ||
        Object.hasOwn(c.data.TCP ?? {}, "8443") ||
        Object.keys(c.data.Web ?? {}).some((h) => h.endsWith(":8443")) ||
        Object.keys(c.data.AllowFunnel ?? {}).some((h) => h.endsWith(":8443")),
    )
  )
    throw setupError();
  return "https://" + hostPort;
}

export type IntegrationConfig = {
  stripeKey: string;
  managementKey: string;
};
export function resendRegistry(
  key: string,
  request: typeof fetch = fetch,
): ResendRegistry {
  if (!key?.startsWith("re_"))
    throw new Error(
      "Set RESEND_MANAGEMENT_API_KEY to a webhook-management credential.",
    );
  async function call(route: string, method = "GET") {
    let response: Response;
    try {
      response = await request(`https://api.resend.com/webhooks${route}`, {
        method,
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new Error(
        "Resend webhook management is unavailable; ownership information has been retained.",
      );
    }
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(
        `Resend webhook management failed (HTTP ${response.status}). Check credentials, rate limits and endpoint capacity.`,
      );
    try {
      return await response.json();
    } catch {
      throw new Error("Invalid Resend webhook-management response.");
    }
  }
  function endpoint(value: ResendEndpoint): ResendEndpoint {
    if (
      !value ||
      typeof value.id !== "string" ||
      !value.id ||
      typeof value.endpoint !== "string" ||
      !Array.isArray(value.events) ||
      !value.events.every((event) => typeof event === "string")
    )
      throw new Error("Invalid Resend endpoint response.");
    return value;
  }
  return {
    async find(url) {
      const matches: ResendEndpoint[] = [];
      let after = "";
      const cursors = new Set<string>();
      do {
        const page = await call(
          `?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`,
        );
        if (!Array.isArray(page?.data) || typeof page.has_more !== "boolean")
          throw new Error("Invalid Resend endpoint-list response.");
        matches.push(
          ...page.data
            .map(endpoint)
            .filter((item: ResendEndpoint) => item.endpoint === url),
        );
        if (!page.has_more) return matches;
        after = page.data.at(-1)?.id;
        if (!after || cursors.has(after))
          throw new Error("Invalid Resend pagination.");
        cursors.add(after);
      } while (after);
      return matches;
    },
    get: async (id) => {
      const result = await call(`/${encodeURIComponent(id)}`);
      if (result === null) return null;
      const value = endpoint(result);
      if (value.id !== id) throw new Error("Mismatched Resend endpoint ID.");
      return value;
    },
    remove: async (id) => {
      await call(`/${encodeURIComponent(id)}`, "DELETE");
    },
  };
}

export async function startIntegration(options: {
  root: string;
  config: IntegrationConfig;
  environment: Environment;
  owner: IntegrationOwner;
  appPort: number;
  start: Start;
  registry: ResendRegistry;
  signal: AbortSignal;
  readTailscale?: ReadTailscale;
}) {
  const {
    root,
    config,
    environment,
    owner,
    appPort,
    start,
    registry,
    signal,
    readTailscale = tailscaleReader(environment),
  } = options;
  const children: Child[] = [];
  let stripeSecret = "";
  let failure: Error | undefined;
  const spawn = (
    name: string,
    command: string,
    args: string[],
    childEnv: Environment,
    line?: (text: string) => void,
  ) => {
    const child = start(name, command, args, childEnv, line);
    children.push(child);
    void child.done.then(() => {
      failure ??= new Error(
        name +
          " stopped unexpectedly. Check authentication and provider capacity.",
      );
    });
    return child;
  };
  const alive = () => {
    signal.throwIfAborted();
    if (failure) throw failure;
  };
  try {
    const origin = await readFunnelOrigin(readTailscale);
    const endpointUrl = origin + "/api/resend/webhook/" + owner.token;
    // Journal the unique registration URL before starting the provider CLI.
    owner.endpoint = endpointUrl;
    await saveOwner(root, owner);
    // Binding the fixed port admits only one integrated run per laptop,
    // including other worktrees. Resend binds before registering its webhook.
    spawn(
      "Resend CLI",
      "resend",
      [
        "webhooks",
        "listen",
        "--url",
        endpointUrl,
        "--port",
        "4318",
        "--events",
        "email.sent",
        "--forward-to",
        "http://127.0.0.1:" + appPort + "/api/resend/webhook",
        "--json",
      ],
      {
        ...childEnvironment(environment, "tools"),
        RESEND_API_KEY: config.managementKey,
      },
      (line) => {
        // CLI errors span multiple lines. Recognize the bind failure without
        // parsing or echoing provider payloads and secrets.
        if (
          /Failed to start local server on port 4318:.*\bEADDRINUSE\b/.test(
            line,
          )
        )
          failure = new Error(
            "Resend port 4318 is already in use. Only one integration run per laptop, including worktrees, is supported; stop the other listener first.",
          );
      },
    );
    const endpoint = await until(
      async () => {
        alive();
        const endpoints = await registry.find(endpointUrl);
        if (endpoints.length > 1)
          throw new Error(
            "Multiple endpoints unexpectedly share this run URL; refusing to select one.",
          );
        return endpoints[0];
      },
      "Resend CLI registration",
      signal,
    );
    owner.resendId = endpoint.id;
    await saveOwner(root, owner);
    const configured = await registry.get(endpoint.id);
    if (
      configured?.endpoint !== owner.endpoint ||
      configured.events.length !== 1 ||
      configured.events[0] !== "email.sent" ||
      !configured.signing_secret?.startsWith("whsec_")
    )
      throw new Error(
        "Resend registration or signing secret was not confirmed.",
      );
    alive();
    spawn(
      "Stripe CLI",
      "stripe",
      [
        "listen",
        "--skip-update",
        "--latest",
        "--events",
        "invoice.payment_succeeded",
        "--device-name",
        owner.token,
        "--forward-to",
        "http://127.0.0.1:" + appPort + "/api/stripe/webhook",
      ],
      {
        ...childEnvironment(environment, "tools"),
        STRIPE_API_KEY: config.stripeKey,
      },
      (line) => {
        stripeSecret ||=
          line.match(
            /Your webhook signing secret is (whsec_[A-Za-z0-9]+)\b/,
          )?.[1] ?? "";
      },
    );
    await until(
      async () => {
        alive();
        return stripeSecret || undefined;
      },
      "Stripe CLI",
      signal,
    );
    return {
      stripeSecret,
      resendSecret: configured.signing_secret,
      target: "http://127.0.0.1:" + appPort + "/api/stripe/webhook",
      done: Promise.race(children.map((child) => child.done)),
      stop: async () => {
        await stopChildren(children);
        await cleanupOwner(root, owner, registry);
      },
    };
  } catch (error) {
    try {
      await stopChildren(children);
      await cleanupOwner(root, owner, registry);
    } catch {
      throw new Error(
        "Integration startup failed and cleanup could not be confirmed. Inspect .quantile/webhooks.json and clean up the stopped integration after resolving provider access/capacity.",
      );
    }
    throw error;
  }
}
