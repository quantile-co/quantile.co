import type { NextConfig } from "next";
import {
  readDevelopmentPortalUrl,
  readHeaderSettings,
  runtimeEnvironment,
} from "./lib/env/env";
import { siteHeaders } from "./lib/http/headers";

const portalUrl = readDevelopmentPortalUrl(runtimeEnvironment());
const nextConfig: NextConfig = {
  compiler: {
    define: portalUrl ? { QUANTILE_DEVELOPMENT_PORTAL_URL: portalUrl } : {},
  },
  async headers() {
    return siteHeaders(readHeaderSettings(runtimeEnvironment()));
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default nextConfig;
