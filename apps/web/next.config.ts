import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspace = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const nextConfig = {
  // Workspace guidance stays in the root AGENTS.md.
  agentRules: false,
  outputFileTracingRoot: workspace,
  turbopack: { root: workspace },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "connect-src 'self' https://cdn.usefathom.com",
              "font-src 'self' data:",
              "form-action 'none'",
              "frame-ancestors 'none'",
              "frame-src 'none'",
              "img-src 'self' data: blob: https://cdn.usefathom.com",
              "object-src 'none'",
              "script-src 'self' 'unsafe-inline'" +
                (development ? " 'unsafe-eval'" : "") +
                " https://cdn.usefathom.com",
              "style-src 'self' 'unsafe-inline'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), payment=()",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      ...(!development
        ? [
            {
              source: "/images/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=86400, stale-while-revalidate=604800",
                },
              ],
            },
          ]
        : []),
    ];
  },
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
} satisfies NextConfig;

export default nextConfig;
