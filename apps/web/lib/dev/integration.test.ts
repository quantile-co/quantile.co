import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readFunnelOrigin,
  resendRegistry,
  startIntegration as startNativeIntegration,
} from "./integration.ts";
import { acquireOwner, type ResendRegistry, readOwner } from "./ownership.ts";
import { type Child, type Start, stopChildren } from "./process.ts";
import { readIntegrationConfig } from "./run.ts";

const hostname = "sample.example.ts.net";
function status() {
  return {
    BackendState: "Running",
    CurrentTailnet: { MagicDNSEnabled: true },
    Self: { DNSName: hostname + ".", CapMap: { https: [], funnel: [] } },
  };
}
function published() {
  return {
    TCP: { "8443": { HTTPS: true } },
    Web: {
      [hostname + ":8443"]: {
        Handlers: {
          "/api/resend/webhook/": { Proxy: "http://127.0.0.1:4318" },
        },
      },
    },
    AllowFunnel: { [hostname + ":8443"]: true },
  };
}
function reader(
  configuration: unknown = published(),
  current: unknown = status(),
) {
  return vi.fn(async (args: string[]) => {
    if (args.join(" ") === "status --json --peers=false") return current;
    expect(args).toEqual(["serve", "status", "--json"]);
    return configuration;
  });
}
const startIntegration = (
  options: Parameters<typeof startNativeIntegration>[0],
) => startNativeIntegration({ readTailscale: reader(), ...options });
const idle = (): Child => ({
  done: new Promise(() => {}),
  stop: vi.fn(async () => {}),
});
let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "quantile-lifecycle-"));
});
afterEach(async () => {
  vi.restoreAllMocks();
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
const registry = (): ResendRegistry => ({
  find: vi.fn(async () => []),
  get: vi.fn(async () => null),
  remove: vi.fn(async () => {}),
});
function registered(url: string) {
  const api = registry();
  vi.mocked(api.find).mockResolvedValue([
    { id: "owned", endpoint: url, events: ["email.sent"] },
  ]);
  vi.mocked(api.get)
    .mockResolvedValueOnce({
      id: "owned",
      endpoint: url,
      events: ["email.sent"],
      signing_secret: "whsec_resend_fixture",
    })
    .mockResolvedValueOnce({
      id: "owned",
      endpoint: url,
      events: ["email.sent"],
    })
    .mockResolvedValue(null);
  return api;
}
const urlFor = (token: string) =>
  "https://" + hostname + ":8443/api/resend/webhook/" + token;

describe("provider lifecycle coordination", () => {
  it("reuses the background Funnel, scopes credentials and cleans only its registration", async () => {
    const owner = await acquireOwner(root, "sample"),
      endpoint = urlFor(owner.token);
    const configuration = published(),
      before = JSON.stringify(configuration),
      readTailscale = reader(configuration);
    const starts: {
      name: string;
      command: string;
      args: string[];
      env: Record<string, string | undefined>;
      child: Child;
    }[] = [];
    let journalAtListenerStart: ReturnType<typeof readOwner> | undefined;
    const stopped: string[] = [];
    const start: Start = (name, command, args, childEnv, line) => {
      const child = {
        ...idle(),
        stop: vi.fn(async () => {
          stopped.push(name);
        }),
      };
      starts.push({ name, command, args, env: childEnv, child });
      if (name === "Resend CLI") journalAtListenerStart = readOwner(root);
      if (name === "Stripe CLI")
        line?.("Ready! Your webhook signing secret is whsec_fixture");
      return child;
    };
    const api = registered(endpoint);
    const integration = await startIntegration({
      root,
      config: readIntegrationConfig(env, "sample"),
      environment: env,
      owner,
      appPort: 3000,
      start,
      registry: api,
      signal: new AbortController().signal,
      readTailscale,
    });
    expect(starts.map((s) => s.name)).toEqual(["Resend CLI", "Stripe CLI"]);
    expect(starts[0].args).toEqual([
      "webhooks",
      "listen",
      "--url",
      endpoint,
      "--port",
      "4318",
      "--events",
      "email.sent",
      "--forward-to",
      "http://127.0.0.1:3000/api/resend/webhook",
      "--json",
    ]);
    expect(await journalAtListenerStart).toMatchObject({ endpoint });
    expect(starts[0].env.RESEND_API_KEY).toBe(env.RESEND_MANAGEMENT_API_KEY);
    expect(starts[0].env.STRIPE_TEST_API_KEY).toBeUndefined();
    expect(starts[1].env.STRIPE_API_KEY).toBe(env.STRIPE_TEST_API_KEY);
    expect(starts[1].env.RESEND_API_KEY).toBeUndefined();
    expect(starts.every((s) => s.env.TAILSCALE_AUTHKEY === undefined)).toBe(
      true,
    );
    // Check real pinned CLI syntax without authentication, network or listeners.
    const help = await promisify(execFile)(
      "stripe",
      [...starts[1].args, "--help"],
      {
        env: { PATH: process.env.PATH, HOME: root, NODE_ENV: "test" },
        timeout: 5000,
      },
    );
    expect(help.stdout).toContain("stripe listen");
    expect(integration).toMatchObject({
      stripeSecret: "whsec_fixture",
      resendSecret: "whsec_resend_fixture",
    });
    expect(
      await readFile(path.join(root, ".quantile/webhooks.json"), "utf8"),
    ).not.toMatch(/whsec_|re_fixture/);
    await integration.stop();
    expect(stopped).toEqual(["Stripe CLI", "Resend CLI"]);
    expect(api.remove).toHaveBeenCalledExactlyOnceWith("owned");
    await expect(readOwner(root)).rejects.toThrow();
    expect(JSON.stringify(configuration)).toBe(before);
    expect(readTailscale).toHaveBeenCalledTimes(2);
  });

  it("rejects an occupied laptop-wide listener without starting Stripe or deleting another registration", async () => {
    const owner = await acquireOwner(root, "sample"),
      api = registry();
    const start: Start = vi.fn((_name, _command, _args, _env, line) => {
      for (const text of JSON.stringify(
        {
          error: {
            code: "server_listen_error",
            message:
              "Failed to start local server on port 4318: listen EADDRINUSE: address already in use :::4318",
          },
        },
        null,
        2,
      ).split("\n"))
        line?.(text);
      return { ...idle(), done: Promise.resolve(1) };
    });
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3001,
        start,
        registry: api,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Only one integration run per laptop");
    expect(start).toHaveBeenCalledTimes(1);
    expect(api.remove).not.toHaveBeenCalled();
    await expect(readOwner(root)).rejects.toThrow();
  });

  it("rolls back its registered listener when Stripe exits during startup", async () => {
    const owner = await acquireOwner(root, "sample"),
      api = registered(urlFor(owner.token));
    const stopped: string[] = [];
    const start: Start = (name) => ({
      done: name === "Stripe CLI" ? Promise.resolve(1) : new Promise(() => {}),
      stop: async () => {
        stopped.push(name);
      },
    });
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        start,
        registry: api,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Stripe CLI stopped");
    expect(stopped).toEqual(["Stripe CLI", "Resend CLI"]);
    expect(api.remove).toHaveBeenCalledExactlyOnceWith("owned");
    await expect(readOwner(root)).rejects.toThrow();
  });

  it("cleans its journal and listener when registration is interrupted", async () => {
    const owner = await acquireOwner(root, "sample"),
      api = registry(),
      abort = new AbortController(),
      child = idle();
    vi.mocked(api.find).mockImplementationOnce(async () => {
      abort.abort();
      return [];
    });
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        start: () => child,
        registry: api,
        signal: abort.signal,
      }),
    ).rejects.toThrow();
    expect(child.stop).toHaveBeenCalledOnce();
    await expect(readOwner(root)).rejects.toThrow();
  });

  it("retains ownership if failed-startup registration cleanup cannot be confirmed", async () => {
    const owner = await acquireOwner(root, "sample"),
      api = registered(urlFor(owner.token));
    vi.mocked(api.remove).mockRejectedValue(new Error("private"));
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        start: () => ({ ...idle(), done: Promise.resolve(1) }),
        registry: api,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("cleanup could not be confirmed");
    expect(await readOwner(root)).toMatchObject({ token: owner.token });
  });

  it("attempts every reverse-order shutdown even when one fails", async () => {
    const order: number[] = [];
    await expect(
      stopChildren(
        [0, 1, 2].map((index) => ({
          done: Promise.resolve(0),
          stop: async () => {
            order.push(index);
            if (index === 1) throw new Error("private");
          },
        })),
      ),
    ).rejects.toThrow("Could not stop all development child processes.");
    expect(order).toEqual([2, 1, 0]);
  });
});

describe("background Funnel prerequisite", () => {
  it("reads only the dedicated background mapping while preserving unrelated listeners", async () => {
    const config = {
      ...published(),
      TCP: { ...published().TCP, "443": { HTTPS: true } },
      Foreground: { other: { TCP: { "10000": { HTTPS: true } } } },
    };
    const before = JSON.stringify(config),
      read = reader(config);
    expect(await readFunnelOrigin(read)).toBe("https://" + hostname + ":8443");
    expect(JSON.stringify(config)).toBe(before);
    expect(read.mock.calls.map(([args]) => args)).toEqual([
      ["status", "--json", "--peers=false"],
      ["serve", "status", "--json"],
    ]);
  });
  it.each(["missing", "wrong-target", "extra-public-route", "foreground"])(
    "rejects %s setup without changing configuration",
    async (variant) => {
      const config = published();
      if (variant === "missing") delete (config as Partial<typeof config>).Web;
      if (variant === "wrong-target")
        config.Web[hostname + ":8443"].Handlers["/api/resend/webhook/"].Proxy =
          "http://127.0.0.1:3000";
      if (variant === "extra-public-route")
        Object.assign(config.Web[hostname + ":8443"].Handlers, {
          "/": { Proxy: "http://127.0.0.1:3000" },
        });
      const value =
        variant === "foreground" ? { Foreground: { owned: config } } : config;
      const before = JSON.stringify(value);
      await expect(readFunnelOrigin(reader(value))).rejects.toThrow(
        "background Funnel",
      );
      expect(JSON.stringify(value)).toBe(before);
    },
  );
  it("rejects a disconnected daemon before reading configuration", async () => {
    const current = { ...status(), BackendState: "NeedsLogin" },
      read = reader(published(), current);
    await expect(readFunnelOrigin(read)).rejects.toThrow("signed-in");
    expect(read).toHaveBeenCalledOnce();
  });
});

describe("Resend registration API", () => {
  it("paginates and filters registry lookups by exact URL", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "other",
              endpoint: "https://other.example.com",
              events: ["email.sent"],
            },
          ],
          has_more: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "owned",
              endpoint: "https://mine.example.com",
              events: ["email.sent"],
            },
          ],
          has_more: false,
        }),
      );
    expect(
      await resendRegistry("re_fixture", request).find(
        "https://mine.example.com",
      ),
    ).toEqual([
      {
        id: "owned",
        endpoint: "https://mine.example.com",
        events: ["email.sent"],
      },
    ]);
    expect(request.mock.calls[1][0]).toContain("after=other");
  });
  it.each([
    { data: [], has_more: "false" },
    { data: [null], has_more: false },
    { data: [], has_more: true },
    {
      data: [
        { id: "owned", endpoint: "https://mine.example.com", events: null },
      ],
      has_more: false,
    },
  ])("rejects malformed pagination and endpoints", async (body) => {
    await expect(
      resendRegistry(
        "re_fixture",
        vi.fn().mockResolvedValue(Response.json(body)),
      ).find("https://mine.example.com"),
    ).rejects.toThrow("Invalid Resend");
  });
  it("rejects mismatched endpoint IDs", async () => {
    const api = resendRegistry(
      "re_fixture",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "other",
          endpoint: "https://mine.example.com",
          events: ["email.sent"],
        }),
      ),
    );
    await expect(api.get("owned")).rejects.toThrow(
      "Mismatched Resend endpoint ID",
    );
  });
  it("sanitizes invalid JSON and quota errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response("secret_not_json"))
      .mockResolvedValueOnce(new Response("secret", { status: 429 }));
    const api = resendRegistry("re_fixture", request);
    await expect(api.find("https://mine.example.com")).rejects.toThrow(
      "Invalid Resend webhook-management response",
    );
    await expect(api.find("https://mine.example.com")).rejects.toThrow(
      "HTTP 429",
    );
  });
});
