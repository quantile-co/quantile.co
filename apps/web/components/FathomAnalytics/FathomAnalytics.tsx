"use client";

import { load, trackPageview } from "fathom-client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
  siteId: string;
  domains: readonly string[];
};

export function FathomAnalytics({ siteId, domains }: Props) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Gate loading itself, not just reporting, on the target's exact hostname.
    if (
      !domains.includes(window.location.hostname) ||
      !pathname ||
      lastPath.current === pathname
    )
      return;
    // The client loads once and queues pageviews until the script is ready.
    // Explicit paths avoid stale canonicals, query data and hash-only visits.
    load(siteId, { auto: false, honorDNT: true });
    trackPageview({ url: pathname });
    lastPath.current = pathname;
  }, [domains, pathname, siteId]);

  return null;
}
