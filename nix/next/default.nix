{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "next.config.ts" (
    pkgs.writeText "next.config.ts" ''
      import path from "node:path";
      import { fileURLToPath } from "node:url";
      import type { NextConfig } from "next";
      import { siteHeaders } from "./lib/http/headers";

      const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
      const nextConfig: NextConfig = {
        // Workspace guidance stays in the root AGENTS.md.
        agentRules: false,
        outputFileTracingRoot: workspace,
        turbopack: { root: workspace },
        async headers() {
          return siteHeaders(process.env.NODE_ENV === "development");
        },
        images: { unoptimized: true },
        experimental: {
          optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
        },
      };

      export default nextConfig;
    ''
  );
}
