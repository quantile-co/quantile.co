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
