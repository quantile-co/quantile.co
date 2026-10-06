import type { NextConfig } from "next";
import firebaseConfig from "./firebase.json";

function hostingHeaders(source: string) {
  const rule = firebaseConfig.hosting.headers.find(
    (entry) => entry.source === source,
  );
  if (!rule) {
    throw new Error(`Missing Firebase Hosting headers for ${source}`);
  }
  return rule.headers;
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: hostingHeaders("**") },
      {
        source: "/_next/static/:path*",
        headers: hostingHeaders("/_next/static/**"),
      },
      { source: "/images/:path*", headers: hostingHeaders("/images/**") },
    ];
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default nextConfig;
