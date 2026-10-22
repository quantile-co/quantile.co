{ pkgs, factory }:
{
  # Preserve the application's established deny-all Rules bytes.
  rulesFile =
    let
      source = builtins.readFile factory.firebase.rulesFile;
      comment = "Server IAM may read; direct client access stays denied.";
    in
    assert pkgs.lib.hasInfix comment source;
    pkgs.writeText "firestore.rules" (
      builtins.replaceStrings
        [ comment ]
        [
          "Only the server's IAM-authenticated Firestore API may access receipts."
        ]
        source
    );
  configFile = factory.firebase.withOverrides {
    hosting = {
      public = "out";
      cleanUrls = true;
      ignore = [
        "firebase.json"
        "**/.*"
        "**/node_modules/**"
      ];
      headers = [
        {
          source = "/_next/static/**";
          headers = [
            {
              key = "Cache-Control";
              value = "public, max-age=31536000, immutable";
            }
          ];
        }
        {
          source = "/images/**";
          headers = [
            {
              key = "Cache-Control";
              value = "public, max-age=86400, stale-while-revalidate=604800";
            }
          ];
        }
        {
          source = "**";
          headers = [
            {
              key = "Content-Security-Policy";
              value = "default-src 'self'; base-uri 'self'; connect-src 'self' https://calendly.com https://*.calendly.com https://cdn.usefathom.com; font-src 'self' data:; form-action 'self' https://checkout.stripe.com https://billing.quantile.co; frame-ancestors 'none'; frame-src https://calendly.com https://*.calendly.com; img-src 'self' data: blob: https://cdn.usefathom.com; object-src 'none'; script-src 'self' 'unsafe-inline' https://assets.calendly.com https://cdn.usefathom.com; style-src 'self' 'unsafe-inline' https://assets.calendly.com";
            }
            {
              key = "Permissions-Policy";
              value = "camera=(), geolocation=(), microphone=(), payment=()";
            }
            {
              key = "Referrer-Policy";
              value = "strict-origin-when-cross-origin";
            }
            {
              key = "X-Content-Type-Options";
              value = "nosniff";
            }
            {
              key = "X-Frame-Options";
              value = "DENY";
            }
          ];
        }
      ];
    };
  };
}
