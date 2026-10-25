// Next substitutes this public constant for launcher-owned development billing.
// These are shareable email-login URLs, never customer-specific sessions.
declare const QUANTILE_DEVELOPMENT_PORTAL_URL: string | undefined;
export const billingPortalLoginUrl =
  typeof QUANTILE_DEVELOPMENT_PORTAL_URL === "string"
    ? QUANTILE_DEVELOPMENT_PORTAL_URL
    : "https://billing.quantile.co/p/login/bJeeVe3TIaVO9ODfkn6AM00";
