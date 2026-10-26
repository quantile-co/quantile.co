import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertFunnelStopped,
  funnelIsReady,
  prepareFunnel,
  resendRegistry,
  startIntegration,
} from "./integration.ts";
import { acquireOwner, type ResendRegistry, readOwner } from "./ownership.ts";
import { type Child, type Start, stopChildren } from "./process.ts";
import { readIntegrationConfig } from "./run.ts";

const hostname = "sample.example.ts.net";
const route = `/api/resend/webhook/sample-${"a".repeat(32)}`;
const endpoint = `https://${hostname}:8443${route}`;
const target = "http://127.0.0.1:4318";
function status() {
  return {
    Version: "1.104.1",
    BackendState: "Running",
    CurrentTailnet: { MagicDNSEnabled: true },
    Self: {
      DNSName: `${hostname}.`,
      CapMap: {
        https: [],
        funnel: [],
        "https://tailscale.com/cap/funnel-ports?ports=443,8443,10000": [],
      } as Record<string, unknown>,
    },
  };
}
function reader(
  configuration: unknown = {},
  currentStatus: unknown = status(),
) {
  return vi.fn(async (args: string[]) => {
    if (args.join(" ") === "status --json --peers=false") return currentStatus;
    expect(args).toEqual(["serve", "status", "--json"]);
    return configuration;
  });
}
function published() {
  return {
    Foreground: {
      owned: {
        TCP: { "8443": { HTTPS: true } },
        Web: {
          [`${hostname}:8443`]: { Handlers: { [route]: { Proxy: target } } },
        },
        AllowFunnel: { [`${hostname}:8443`]: true },
      },
    },
  };
}

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "quantile-lifecycle-"));
});
afterEach(async () => {
  vi.useRealTimers();
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
const tailscaleStatus = status();
const emptyTailscaleRead = async (args: string[]) =>
  args[0] === "status" ? tailscaleStatus : {};

describe("provider lifecycle coordination", () => {
  it("reuses local Tailscale auth, scopes credentials and cleans only owned registrations", async () => {
    const owner = await acquireOwner(root, "sample");
    let foreground: Record<string, unknown> = {};
    const privateServe = { TCP: { "443": { HTTPS: true } } };
    const readTailscale = vi.fn(async (args: string[]) =>
      args[0] === "status"
        ? tailscaleStatus
        : { ...privateServe, Foreground: foreground },
    );
    let journalAtFunnelStart: ReturnType<typeof readOwner> | undefined;
    const starts: {
      name: string;
      args: string[];
      env: Record<string, string | undefined>;
      child: Child;
    }[] = [];
    const start: Start = (name, _command, args, childEnv, line) => {
      const done = Promise.withResolvers<number>();
      const child = {
        done: done.promise,
        stop: vi.fn(async () => {
          if (name === "Tailscale Funnel") foreground = {};
          done.resolve(0);
        }),
      };
      starts.push({ name, args, env: childEnv, child });
      if (name === "Tailscale Funnel") {
        journalAtFunnelStart = readOwner(root);
        foreground = {
          session: {
            TCP: { "8443": { HTTPS: true } },
            Web: {
              "sample.example.ts.net:8443": {
                Handlers: {
                  [`/api/resend/webhook/${owner.token}`]: {
                    Proxy: "http://127.0.0.1:4318",
                  },
                },
              },
            },
            AllowFunnel: { "sample.example.ts.net:8443": true },
          },
        };
      }
      if (name === "Stripe CLI")
        line?.("Ready! Your webhook signing secret is whsec_fixture");
      return child;
    };
    const api = registry();
    const endpoint = `https://sample.example.ts.net:8443/api/resend/webhook/${owner.token}`;
    vi.mocked(api.find).mockResolvedValue([
      { id: "owned", endpoint, events: ["email.sent"] },
    ]);
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: "owned",
        endpoint,
        events: ["email.sent"],
        signing_secret: "whsec_resend_fixture",
      })
      .mockResolvedValueOnce({ id: "owned", endpoint, events: ["email.sent"] })
      .mockResolvedValue(null);
    const integration = await startIntegration({
      root,
      config: readIntegrationConfig(env, "sample"),
      environment: env,
      owner,
      appPort: 3000,
      resendPort: 4318,
      start,
      registry: api,
      signal: new AbortController().signal,
      readTailscale,
    });
    expect(starts.map((s) => s.name)).toEqual([
      "Stripe CLI",
      "Resend CLI",
      "Tailscale Funnel",
    ]);
    expect(starts[2].args).toEqual([
      "funnel",
      "--https=8443",
      `--set-path=/api/resend/webhook/${owner.token}`,
      "http://127.0.0.1:4318",
    ]);
    expect(await journalAtFunnelStart).toMatchObject({
      endpoint,
      resendId: "owned",
    });
    expect(starts[0].args).not.toContain("--live");
    expect(starts[0].args).toContain("--latest");
    expect(starts[0].env.STRIPE_API_KEY).toBe(env.STRIPE_TEST_API_KEY);
    expect(starts[0].env.RESEND_API_KEY).toBeUndefined();
    expect(starts[1].env.RESEND_API_KEY).toBe(env.RESEND_MANAGEMENT_API_KEY);
    expect(starts[1].env.STRIPE_TEST_API_KEY).toBeUndefined();
    expect(starts[2].env.RESEND_API_KEY).toBeUndefined();
    expect(starts[2].env.STRIPE_TEST_API_KEY).toBeUndefined();
    expect(integration).toMatchObject({
      stripeSecret: "whsec_fixture",
      resendSecret: "whsec_resend_fixture",
    });
    expect(
      await readFile(path.join(root, ".quantile/webhooks.json"), "utf8"),
    ).not.toMatch(/whsec_|re_fixture/);
    expect(await readdir(path.join(root, ".quantile"))).toEqual([
      "webhooks.json",
    ]);
    await integration.stop();
    expect(api.remove).toHaveBeenCalledWith("owned");
    expect(
      starts.every((s) => vi.mocked(s.child.stop).mock.calls.length === 1),
    ).toBe(true);
    await expect(readOwner(root)).rejects.toThrow();
  });
  it("rolls back startup on CLI exit without waiting for timeout", async () => {
    const owner = await acquireOwner(root, "sample");
    const stop = vi.fn(async () => {});
    const api = registry();
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        resendPort: 4318,
        start: () => ({ done: Promise.resolve(1), stop }),
        registry: api,
        signal: new AbortController().signal,
        readTailscale: emptyTailscaleRead,
      }),
    ).rejects.toThrow("capacity");
    expect(stop).toHaveBeenCalledOnce();
    expect(api.remove).not.toHaveBeenCalled();
    await expect(readOwner(root)).rejects.toThrow();
  });
  it("rolls back startup on interruption", async () => {
    const owner = await acquireOwner(root, "sample");
    const abort = new AbortController();
    const stop = vi.fn(async () => {});
    const start = vi.fn<Start>(() => ({ done: new Promise(() => {}), stop }));
    const api = registry();
    const result = startIntegration({
      root,
      config: readIntegrationConfig(env, "sample"),
      environment: env,
      owner,
      appPort: 3000,
      resendPort: 4318,
      start,
      registry: api,
      signal: abort.signal,
      readTailscale: emptyTailscaleRead,
    });
    const rejection = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    abort.abort();
    await rejection;
    expect(stop).toHaveBeenCalledOnce();
    await expect(readOwner(root)).rejects.toThrow();
  });
  it("retains the journal when startup fails and Funnel shutdown cannot be confirmed", async () => {
    const owner = await acquireOwner(root, "sample");
    let started = false;
    let stopped = false;
    const api = registry();
    const endpoint = `https://sample.example.ts.net:8443/api/resend/webhook/${owner.token}`;
    vi.mocked(api.find).mockResolvedValue([
      { id: "owned", endpoint, events: ["email.sent"] },
    ]);
    vi.mocked(api.get).mockResolvedValue({
      id: "owned",
      endpoint,
      events: ["email.sent"],
      signing_secret: "whsec_fixture",
    });
    const readTailscale = async (args: string[]) => {
      if (args[0] === "status") return tailscaleStatus;
      if (stopped) throw new Error("sensitive-local-state");
      return started
        ? {
            Foreground: {
              owned: {
                TCP: { "8443": { HTTPS: true } },
                Web: {
                  "sample.example.ts.net:8443": {
                    Handlers: {
                      [`/api/resend/webhook/${owner.token}`]: {
                        Proxy: "http://127.0.0.1:4318",
                      },
                    },
                  },
                },
                AllowFunnel: { "sample.example.ts.net:8443": true },
              },
            },
          }
        : {};
    };
    const start: Start = (name, _command, _args, _environment, line) => {
      if (name === "Tailscale Funnel") started = true;
      if (name === "Stripe CLI")
        line?.("Your webhook signing secret is whsec_fixture");
      return {
        done:
          name === "Tailscale Funnel"
            ? Promise.resolve(1)
            : new Promise(() => {}),
        stop: async () => {
          if (name === "Tailscale Funnel") stopped = true;
        },
      };
    };
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        resendPort: 4318,
        start,
        registry: api,
        signal: new AbortController().signal,
        readTailscale,
      }),
    ).rejects.toThrow("cleanup could not be confirmed");
    expect(await readOwner(root)).toMatchObject({
      token: owner.token,
      endpoint: expect.stringContaining(owner.token),
    });
    expect(api.remove).not.toHaveBeenCalled();
  });
  it("never publishes a Funnel if the Resend listener cannot start", async () => {
    const owner = await acquireOwner(root, "sample");
    const names: string[] = [];
    const start: Start = (name, _command, _args, _environment, line) => {
      names.push(name);
      if (name === "Stripe CLI")
        line?.("Your webhook signing secret is whsec_fixture");
      return {
        done:
          name === "Resend CLI" ? Promise.resolve(1) : new Promise(() => {}),
        stop: async () => {},
      };
    };
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        resendPort: 4318,
        start,
        registry: registry(),
        signal: new AbortController().signal,
        readTailscale: emptyTailscaleRead,
      }),
    ).rejects.toThrow("capacity");
    expect(names).toEqual(["Stripe CLI", "Resend CLI"]);
    await expect(readOwner(root)).rejects.toThrow();
  });
  it("does not publish if the listener exits during registration readback", async () => {
    const owner = await acquireOwner(root, "sample");
    const endpoint = `https://sample.example.ts.net:8443/api/resend/webhook/${owner.token}`;
    const closed = Promise.withResolvers<number>();
    const api = registry();
    vi.mocked(api.find).mockResolvedValue([
      { id: "owned", endpoint, events: ["email.sent"] },
    ]);
    vi.mocked(api.get)
      .mockImplementationOnce(async () => {
        closed.resolve(1);
        await Promise.resolve();
        return {
          id: "owned",
          endpoint,
          events: ["email.sent"],
          signing_secret: "whsec_fixture",
        };
      })
      .mockResolvedValue(null);
    const names: string[] = [];
    const start: Start = (name, _command, _args, _environment, line) => {
      names.push(name);
      if (name === "Stripe CLI")
        line?.("Your webhook signing secret is whsec_fixture");
      return {
        done: name === "Resend CLI" ? closed.promise : new Promise(() => {}),
        stop: async () => {},
      };
    };
    await expect(
      startIntegration({
        root,
        config: readIntegrationConfig(env, "sample"),
        environment: env,
        owner,
        appPort: 3000,
        resendPort: 4318,
        start,
        registry: api,
        signal: new AbortController().signal,
        readTailscale: emptyTailscaleRead,
      }),
    ).rejects.toThrow("capacity");
    expect(names).toEqual(["Stripe CLI", "Resend CLI"]);
    await expect(readOwner(root)).rejects.toThrow();
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

describe("Tailscale Funnel preflight", () => {
  it("discovers the authenticated ts.net origin without changing configuration", async () => {
    const read = reader();
    expect(await prepareFunnel(read)).toBe(`https://${hostname}:8443`);
    expect(read.mock.calls.map(([args]) => args)).toEqual([
      ["status", "--json", "--peers=false"],
      ["serve", "status", "--json"],
    ]);
    expect(await prepareFunnel(reader(null), 443)).toBe(`https://${hostname}`);
  });
  it("reserves neither private Serve ports nor other foreground listeners", async () => {
    const configuration = { ...published(), TCP: { "443": { HTTPS: true } } };
    expect(await prepareFunnel(reader(configuration))).toBe(
      `https://${hostname}:10000`,
    );
    await expect(prepareFunnel(reader(configuration), 443)).rejects.toThrow(
      "unused",
    );
    await expect(prepareFunnel(reader(configuration), 8443)).rejects.toThrow(
      "unused",
    );
    expect(funnelIsReady(configuration, endpoint, target)).toBe(true);
  });
  it("fails instead of evicting listeners when all three ports are occupied", async () => {
    await expect(
      prepareFunnel(reader({ TCP: { "443": {}, "8443": {}, "10000": {} } })),
    ).rejects.toThrow("will not be replaced");
  });
  it("treats orphan Web/Funnel settings as occupied too", async () => {
    expect(
      await prepareFunnel(
        reader({
          Web: {
            [`${hostname}:8443`]: {
              Handlers: { "/private": { Text: "private" } },
            },
          },
        }),
      ),
    ).toBe(`https://${hostname}:10000`);
    expect(
      await prepareFunnel(
        reader({ AllowFunnel: { [`${hostname}:8443`]: false } }),
      ),
    ).toBe(`https://${hostname}:10000`);
  });
  it("respects the daemon's allowed port ranges and explicit selection", async () => {
    const current = status();
    current.Self.CapMap = {
      https: [],
      funnel: [],
      "https://tailscale.com/cap/funnel-ports?ports=10000-10000": [],
    };
    expect(await prepareFunnel(reader({}, current))).toBe(
      `https://${hostname}:10000`,
    );
    await expect(prepareFunnel(reader({}, current), 8443)).rejects.toThrow(
      "permitted",
    );
    await expect(prepareFunnel(reader(), 80)).rejects.toThrow("permitted");
  });
  it.each(["1.52.0", "1.98.1", "invalid"])(
    "rejects daemon %s before publishing",
    async (Version) => {
      const read = reader({}, { ...status(), Version });
      await expect(prepareFunnel(read)).rejects.toThrow("1.98.2");
      expect(read).toHaveBeenCalledOnce();
    },
  );
  it("accepts the verified minimum daemon release", async () => {
    expect(
      await prepareFunnel(reader({}, { ...status(), Version: "1.98.2" })),
    ).toBe(`https://${hostname}:8443`);
  });
  it.each([
    "localhost",
    "127.0.0.1",
    "evil.example",
    "sample.ts.net.evil.example",
    "https://sample.example.ts.net",
    "sample.example.ts.net/path",
  ])("rejects an unsafe discovered name %s", async (DNSName) => {
    const current = status();
    current.Self.DNSName = DNSName;
    await expect(prepareFunnel(reader({}, current))).rejects.toThrow(
      "hostname",
    );
  });
  it.each(["https", "funnel"])(
    "requires pre-enabled %s, never interactive onboarding",
    async (capability) => {
      const current = status();
      delete current.Self.CapMap[capability];
      const read = reader({}, current);
      await expect(prepareFunnel(read)).rejects.toThrow("administrator first");
      expect(read).toHaveBeenCalledOnce();
    },
  );
  it.each([
    { ...status(), BackendState: "NeedsLogin" },
    { ...status(), CurrentTailnet: { MagicDNSEnabled: false } },
    {},
    null,
  ])("rejects disconnected or unconfigured daemons", async (current) => {
    await expect(prepareFunnel(reader({}, current))).rejects.toThrow(
      "signed-in",
    );
  });
  it.each([
    { TCP: [] },
    { Foreground: { broken: null } },
    { Web: { invalid: {} } },
    "private-data",
  ])(
    "fails closed on malformed shared configuration",
    async (configuration) => {
      await expect(prepareFunnel(reader(configuration))).rejects.toThrow(
        "Invalid Tailscale Serve",
      );
    },
  );
});

describe("foreground Funnel ownership", () => {
  it("requires exact readback, not a CLI log or a persistent mapping", () => {
    expect(funnelIsReady({}, endpoint, target)).toBe(false);
    expect(funnelIsReady(published(), endpoint, target)).toBe(true);
    expect(() =>
      funnelIsReady(published().Foreground.owned, endpoint, target),
    ).toThrow("ownership");
  });
  it("rejects a port stolen between preflight and foreground startup", () => {
    expect(() =>
      funnelIsReady({ TCP: { "8443": { HTTPS: true } } }, endpoint, target),
    ).toThrow("ownership");
    const config = published();
    expect(() =>
      funnelIsReady(
        {
          Foreground: { ...config.Foreground, other: config.Foreground.owned },
        },
        endpoint,
        target,
      ),
    ).toThrow("ownership");
  });
  it("rejects a shared public port, another target or disabled Funnel", () => {
    const config = published();
    config.Foreground.owned.Web[`${hostname}:8443`].Handlers["/private"] = {
      Proxy: "http://127.0.0.1:9999",
    };
    expect(() => funnelIsReady(config, endpoint, target)).toThrow("ownership");
    expect(() =>
      funnelIsReady(published(), endpoint, "http://127.0.0.1:9999"),
    ).toThrow("ownership");
    const disabled = published();
    disabled.Foreground.owned.AllowFunnel[`${hostname}:8443`] = false;
    expect(() => funnelIsReady(disabled, endpoint, target)).toThrow(
      "ownership",
    );
  });
  it("confirms only the owned route disappeared, preserving other listeners", async () => {
    const read = reader({
      TCP: { "443": { HTTPS: true } },
      Web: {
        [`${hostname}:443`]: { Handlers: { "/private": { Text: "private" } } },
      },
    });
    await assertFunnelStopped(read, endpoint);
    expect(read.mock.calls.map(([args]) => args)).toEqual([
      ["status", "--json", "--peers=false"],
      ["serve", "status", "--json"],
    ]);
  });
  it("refuses to release ownership after a device or tailnet switch", async () => {
    const current = status();
    current.Self.DNSName = "another.other-tailnet.ts.net.";
    const read = reader({}, current);
    await expect(assertFunnelStopped(read, endpoint)).rejects.toThrow(
      "ownership has been retained",
    );
    expect(read).toHaveBeenCalledOnce();
  });
  it("does not read daemon state before a route has been journaled", async () => {
    const read = reader();
    await assertFunnelStopped(read);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses cleanup when a crashed launcher's foreground CLI is still running", async () => {
    vi.useFakeTimers();
    const read = reader(published());
    const stopped = expect(assertFunnelStopped(read, endpoint)).rejects.toThrow(
      "ownership has been retained",
    );
    await vi.advanceTimersByTimeAsync(6000);
    await stopped;
    expect(
      read.mock.calls.every(([args]) =>
        ["serve status --json", "status --json --peers=false"].includes(
          args.join(" "),
        ),
      ),
    ).toBe(true);
  });
  it("retains ownership without echoing read errors", async () => {
    const read = vi.fn(async () => {
      throw new Error("sensitive-config");
    });
    await expect(assertFunnelStopped(read, endpoint)).rejects.toThrow(
      "shutdown could not be confirmed",
    );
    await expect(assertFunnelStopped(read, endpoint)).rejects.not.toThrow(
      "sensitive-config",
    );
  });
});
