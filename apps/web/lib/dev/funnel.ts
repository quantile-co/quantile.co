import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { childEnvironment, type Environment, until } from "./process.ts";

export type ReadTailscale = (args: string[]) => Promise<unknown>;
export function tailscaleReader(environment: Environment): ReadTailscale {
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

const portKey = z
  .string()
  .regex(/^[1-9][0-9]{0,4}$/)
  .refine((v) => Number(v) <= 65535);
const hostPortKey = z
  .string()
  .refine((v) => portKey.safeParse(v.split(":").at(-1)).success);
const configSchema = z
  .object({
    TCP: z.record(portKey, z.unknown()).optional(),
    Web: z
      .record(
        hostPortKey,
        z
          .object({
            Handlers: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      )
      .optional(),
    AllowFunnel: z.record(hostPortKey, z.boolean()).optional(),
    Foreground: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

function configurations(value: unknown) {
  try {
    const root = configSchema.parse(value === null ? {} : value);
    const foreground = Object.values(root.Foreground ?? {}).map((value) => {
      const config = configSchema.parse(value);
      if (Object.keys(config.Foreground ?? {}).length) throw new Error();
      return config;
    });
    return { root, foreground };
  } catch {
    throw new Error(
      "Invalid Tailscale Serve configuration; refusing to use shared settings.",
    );
  }
}

type Config = z.infer<typeof configSchema>;
function usesPort(config: Config, port: number) {
  return (
    Object.hasOwn(config.TCP ?? {}, String(port)) ||
    [
      ...Object.keys(config.Web ?? {}),
      ...Object.keys(config.AllowFunnel ?? {}),
    ].some((host) => host.endsWith(`:${port}`))
  );
}

export async function prepareFunnel(
  read: ReadTailscale,
  requestedPort?: number,
) {
  const status = z
    .object({
      Version: z.string(),
      BackendState: z.literal("Running"),
      CurrentTailnet: z.object({ MagicDNSEnabled: z.literal(true) }),
      Self: z.object({
        DNSName: z.string(),
        CapMap: z.record(z.string(), z.unknown()),
      }),
    })
    .safeParse(await read(["status", "--json", "--peers=false"]));
  if (!status.success)
    throw new Error(
      "Integration requires a signed-in Tailscale daemon with MagicDNS enabled.",
    );
  const { Version, Self } = status.data;
  const version = Version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
    ?.slice(1)
    .map(Number);
  // Verified native foreground-port conflict protection and configuration CAS.
  if (
    !version ||
    !(
      version[0] > 1 ||
      (version[0] === 1 &&
        (version[1] > 98 || (version[1] === 98 && version[2] >= 2)))
    )
  )
    throw new Error(
      "Tailscale daemon 1.98.2 or newer is required for safe foreground port ownership.",
    );
  const hostname = Self.DNSName.replace(/\.$/, "");
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.ts\.net$/.test(
      hostname,
    )
  )
    throw new Error(
      "Tailscale must provide a valid device hostname in its ts.net domain.",
    );
  if (
    !Object.hasOwn(Self.CapMap, "https") ||
    !Object.hasOwn(Self.CapMap, "funnel")
  )
    throw new Error(
      "Enable HTTPS and grant this device Funnel permission through the tailnet administrator first; the launcher never enables them.",
    );

  const allowed = Object.keys(Self.CapMap).flatMap((key) => {
    if (!key.startsWith("https://tailscale.com/cap/funnel-ports?")) return [];
    const url = new URL(key);
    return url.searchParams.get("ports")?.split(",") ?? [];
  });
  const { root, foreground } = configurations(
    await read(["serve", "status", "--json"]),
  );
  const candidates =
    requestedPort === undefined ? [8443, 10000, 443] : [requestedPort];
  const port = candidates.find(
    (port) =>
      [443, 8443, 10000].includes(port) &&
      allowed.some((range) => {
        const parts = range.split("-");
        if (
          parts.length > 2 ||
          parts.some((v) => !portKey.safeParse(v).success)
        )
          return false;
        return port >= Number(parts[0]) && port <= Number(parts[1] ?? parts[0]);
      }) &&
      ![root, ...foreground].some((config) => usesPort(config, port)),
  );
  if (port === undefined)
    throw new Error(
      "No permitted unused Tailscale Funnel port is available (443, 8443, 10000). Existing private Serve and public Funnel listeners will not be replaced.",
    );
  return `https://${hostname}${port === 443 ? "" : `:${port}`}`;
}

export function funnelIsReady(
  value: unknown,
  endpoint: string,
  target: string,
) {
  const url = new URL(endpoint);
  const port = Number(url.port || 443);
  const hostPort = `${url.hostname}:${port}`;
  const { root, foreground } = configurations(value);
  const matches = foreground.filter((config) => usesPort(config, port));
  if (!usesPort(root, port) && matches.length === 0) return false;
  const config = matches[0];
  if (
    usesPort(root, port) ||
    matches.length !== 1 ||
    !config ||
    Object.keys(config.TCP ?? {}).length !== 1 ||
    !z
      .object({ HTTPS: z.literal(true) })
      .strict()
      .safeParse(config.TCP?.[String(port)]).success ||
    Object.keys(config.Web ?? {}).length !== 1 ||
    Object.keys(config.Web?.[hostPort]?.Handlers ?? {}).length !== 1 ||
    !z
      .object({ Proxy: z.literal(target) })
      .strict()
      .safeParse(config.Web?.[hostPort]?.Handlers[url.pathname]).success ||
    Object.keys(config.AllowFunnel ?? {}).length !== 1 ||
    config.AllowFunnel?.[hostPort] !== true
  )
    throw new Error(
      "Tailscale Funnel port ownership or routing changed. Refusing to share or replace another listener.",
    );
  return true;
}

export async function assertFunnelStopped(
  read: ReadTailscale,
  endpoint?: string,
) {
  if (!endpoint) return;
  const url = new URL(endpoint);
  const pathname = url.pathname;
  try {
    const current = z
      .object({ Self: z.object({ DNSName: z.string() }) })
      .safeParse(await read(["status", "--json", "--peers=false"]));
    if (
      !current.success ||
      current.data.Self.DNSName.replace(/\.$/, "") !== url.hostname
    )
      throw new Error("Tailscale device identity changed.");
    await until(
      async () => {
        const { root, foreground } = configurations(
          await read(["serve", "status", "--json"]),
        );
        const remains = [root, ...foreground].some((config) =>
          Object.values(config.Web ?? {}).some(
            ({ Handlers }) =>
              Object.hasOwn(Handlers, pathname) ||
              Object.hasOwn(Handlers, `${pathname}/`),
          ),
        );
        return remains ? undefined : true;
      },
      "owned Tailscale Funnel shutdown",
      new AbortController().signal,
      5000,
    );
  } catch {
    throw new Error(
      "Funnel shutdown could not be confirmed. Stop this integration's foreground Tailscale CLI before cleanup; ownership has been retained and no shared settings were reset.",
    );
  }
}
