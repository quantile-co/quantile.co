import { afterEach, describe, expect, it, vi } from "vitest";
import { assertFunnelStopped, funnelIsReady, prepareFunnel } from "./funnel.ts";

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

afterEach(() => vi.useRealTimers());

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
