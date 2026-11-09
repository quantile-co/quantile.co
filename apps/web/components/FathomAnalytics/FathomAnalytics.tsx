"use client";

import { load, trackPageview } from "fathom-client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function readFathomSettings(env: Record<string, string | undefined>) {
  const siteId = env.NEXT_PUBLIC_FATHOM_SITE_ID?.trim();
  if (env.NODE_ENV !== "production" || !siteId) return null;
  const domains = env.NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS?.split(",").map(
    (domain) => domain.trim().toLowerCase(),
  );
  if (
    !/^[A-Z0-9]{8}$/.test(siteId) ||
    !domains?.length ||
    !domains.every(
      (domain) =>
        domain.length <= 253 &&
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain),
    )
  )
    throw new Error("Invalid Fathom configuration.");
  return { siteId, domains: [...new Set(domains)] };
}

type Props = {
  settings?: ReturnType<typeof readFathomSettings>;
};

export function FathomAnalytics({
  // Explicit property access keeps these public settings in Next's build-time bundle.
  settings = readFathomSettings({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_FATHOM_SITE_ID: process.env.NEXT_PUBLIC_FATHOM_SITE_ID,
    NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS:
      process.env.NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS,
  }),
}: Props) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Gate loading itself, not just reporting, on the target's exact hostname.
    if (
      !settings?.domains.includes(window.location.hostname) ||
      !pathname ||
      lastPath.current === pathname
    )
      return;
    // The client loads once and queues pageviews until the script is ready.
    // Explicit paths avoid stale canonicals, query data and hash-only visits.
    load(settings.siteId, { auto: false, honorDNT: true });
    trackPageview({ url: pathname });
    lastPath.current = pathname;
  }, [settings, pathname]);

  return null;
}
