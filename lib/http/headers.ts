import firebaseConfig from "../../firebase.json";

function hostingHeaders(source: string) {
  const rule = firebaseConfig.hosting.headers.find(
    (entry) => entry.source === source,
  );
  if (!rule) throw new Error(`Missing Firebase Hosting headers for ${source}`);
  return rule.headers;
}

export function siteHeaders(settings: {
  development: boolean;
  cacheAssets: boolean;
}) {
  const security = hostingHeaders("**").map((header) => {
    if (!settings.development || header.key !== "Content-Security-Policy")
      return header;
    // Next/React's development debugging needs eval; production never does.
    // Same-origin connect-src covers the development server.
    return {
      ...header,
      value: header.value.replace(
        "script-src 'self'",
        "script-src 'self' 'unsafe-eval'",
      ),
    };
  });
  return [
    { source: "/:path*", headers: security },
    ...(settings.cacheAssets
      ? [{ source: "/images/:path*", headers: hostingHeaders("/images/**") }]
      : []),
  ];
}
