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
    // Leave development caching/HMR intact; App Hosting builds run in production.
    // Next itself sets immutable caching on its hashed /_next/static assets.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      { source: "/:path*", headers: hostingHeaders("**") },
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
