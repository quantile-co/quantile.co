import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import {
  readDevelopmentPortalUrl,
  readHeaderSettings,
  runtimeEnvironment,
} from "./lib/env/env";
import { siteHeaders } from "./lib/http/headers";

const portalUrl = readDevelopmentPortalUrl(runtimeEnvironment());
const workspace = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const nextConfig: NextConfig = {
  // Workspace guidance stays in the root AGENTS.md.
  agentRules: false,
  outputFileTracingRoot: workspace,
  turbopack: { root: workspace },
  compiler: {
    define: portalUrl ? { QUANTILE_DEVELOPMENT_PORTAL_URL: portalUrl } : {},
  },
  async headers() {
    return siteHeaders(readHeaderSettings(runtimeEnvironment()));
  },
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default nextConfig;
