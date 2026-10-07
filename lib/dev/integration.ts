import { writeFile } from "node:fs/promises";
import path from "node:path";
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

export type IntegrationConfig = {
  stripeKey: string;
  managementKey: string;
  origin?: string;
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
  resendPort: number;
  start: Start;
  registry: ResendRegistry;
  signal: AbortSignal;
  ngrokConfig: string;
}) {
  const {
    root,
    config,
    environment,
    owner,
    appPort,
    resendPort,
    start,
    registry,
    signal,
    ngrokConfig,
  } = options;
  const { origin: requestedOrigin } = config;
  let origin = "";
  const children: Child[] = [];
  let stripeSecret = "";
  let tunnelReady = false;
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
        `${name} stopped unexpectedly. Check authentication and provider capacity.`,
      );
    });
    return child;
  };
  const alive = () => {
    signal.throwIfAborted();
    if (failure) throw failure;
  };
  const configFile = path.join(root, ".quantile/ngrok.yml");
  try {
    // Merge a secret-free overlay with the existing authenticated CLI config.
    // Never read, copy or print the saved authtoken. Disable the shared local
    // inspection port and never enable endpoint pooling between app versions.
    await writeFile(
      configFile,
      `version: "3"\nagent:\n  web_addr: false\n  update_check: false\n`,
      { mode: 0o600 },
    );
    spawn(
      "ngrok",
      "ngrok",
      [
        "http",
        `http://127.0.0.1:${resendPort}`,
        ...(requestedOrigin ? ["--url", requestedOrigin] : []),
        "--config",
        ngrokConfig,
        "--config",
        configFile,
        "--metadata",
        owner.token,
        "--inspect=false",
        "--log",
        "stdout",
        "--log-format",
        "json",
      ],
      childEnvironment(environment, "tools"),
      (line) => {
        try {
          const message = JSON.parse(line);
          if (message.msg === "started tunnel") {
            const url = new URL(message.url);
            if (
              url.protocol === "https:" &&
              !url.username &&
              !url.password &&
              !url.search &&
              !url.hash &&
              url.pathname === "/" &&
              (!requestedOrigin || url.origin === requestedOrigin)
            ) {
              origin = url.origin;
              tunnelReady = true;
            }
          }
        } catch {
          /* not a readiness message */
        }
      },
    );
    await until(
      async () => {
        alive();
        return tunnelReady || undefined;
      },
      "ngrok",
      signal,
    );
    const endpointUrl = `${origin}/api/resend/webhook/${owner.token}`;
    owner.endpoint = endpointUrl;
    await saveOwner(root, owner);
    spawn(
      "Stripe CLI",
      "stripe",
      [
        "listen",
        "--skip-update",
        "--latest",
        "--events",
        "invoice.payment_succeeded",
        "--events-from",
        "@self",
        "--device-name",
        owner.token,
        "--forward-to",
        `http://127.0.0.1:${appPort}/api/stripe/webhook`,
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
    spawn(
      "Resend CLI",
      "resend",
      [
        "webhooks",
        "listen",
        "--url",
        owner.endpoint,
        "--port",
        String(resendPort),
        "--events",
        "email.sent",
        "--forward-to",
        `http://127.0.0.1:${appPort}/api/resend/webhook`,
        "--json",
      ],
      {
        ...childEnvironment(environment, "tools"),
        RESEND_API_KEY: config.managementKey,
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
    return {
      stripeSecret,
      resendSecret: configured.signing_secret,
      target: `http://127.0.0.1:${appPort}/api/stripe/webhook`,
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
        "Integration startup failed and cleanup could not be confirmed. Inspect .quantile/webhooks.json and run pnpm dev --cleanup-integration after resolving provider access/capacity.",
      );
    }
    throw error;
  }
}
