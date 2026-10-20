{ config, pkgs }:
pkgs.runCommand "secretspec.toml" { } ''
  substitute ${config.quantile.secretspec.configFile} "$out" \
    --replace-fail 'name     = "factory"' 'name     = "quantile.co"' \
    --replace-fail '[profiles.default]' '[profiles.default]
  PORT = { description = "Local HTTP port; the launcher defaults to 3000.", required = false, providers = ["env"] }
  NODE_ENV = { description = "Framework-owned build/test mode, independent of billing.", required = false, providers = ["env"] }
  QUANTILE_APP_INSTANCE = { description = "Application instance; local development can generate one.", required = false, providers = ["env"] }
  GCP_PROJECT_ID = { description = "Application database project; tests force demo-quantile. Infrastructure CI uses its separate state project.", required = false, providers = ["env"] }
  FIRESTORE_EMULATOR_HOST = { description = "Loopback emulator address; the launcher starts an isolated emulator when needed.", required = false, providers = ["env"] }
  NEXT_TELEMETRY_DISABLED = { description = "Next telemetry switch supplied by Devenv.", required = false, providers = ["env"] }
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = { description = "Chromium executable supplied by Devenv.", required = false, providers = ["env"] }
  FIREBASE_CLI_DISABLE_UPDATE_CHECK = { description = "Update-check switch supplied by the emulator launcher.", required = false, providers = ["env"] }
  '
  cat >> "$out" <<'TOML'

  # Optional public values baked into application builds, never credentials.
  [profiles.build.defaults]
  providers = ["env"]

  [profiles.build]
  NEXT_PUBLIC_FATHOM_SITE_ID = { description = "Optional public Fathom site ID; analytics are disabled when absent.", required = false }
  NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS = { description = "Comma-separated analytics domains; required by the app when a site ID is set.", required = false }

  # Explicit pnpm dev --integration or pnpm test:integration; ordinary dev uses default.
  [profiles.integration.defaults]
  providers = ["env"]

  [profiles.integration]
  STRIPE_EVENT_LIVEMODE = { description = "Must be false for development provider operations.", required = true }
  STRIPE_TEST_API_KEY = { description = "Development Stripe key; rk_test_ or sk_test_ only.", required = true }
  STRIPE_PRICE_ID = { description = "Reviewed development Stripe Price in the same account.", required = true }
  RESEND_API_KEY = { description = "Development email-sending credential.", required = true }
  RESEND_MANAGEMENT_API_KEY = { description = "Development webhook-management and verification credential.", required = true }
  QUANTILE_EMAIL_FROM = { description = "Development sender address.", required = true }
  QUANTILE_EMAIL_REPLY_TO = { description = "Development reply-to address.", required = true }
  NGROK_CONFIG = { description = "Existing authenticated ngrok configuration path; no ngrok token is stored here.", required = false }
  NGROK_URL = { description = "Optional reserved HTTPS origin; may include {appInstance}.", required = false }
  # Launcher-generated values, not operator inputs. Leave unset before launch.
  STRIPE_WEBHOOK_SECRET = { description = "Launcher-owned Stripe listener signing secret.", required = false }
  RESEND_WEBHOOK_SECRET = { description = "Launcher-owned Resend listener signing secret.", required = false }
  QUANTILE_SITE_ORIGIN = { description = "Launcher-owned local application origin.", required = false }
  QUANTILE_DEVELOPMENT_PORTAL_URL = { description = "Launcher-discovered portal URL; never set before launch.", required = false }
  QUANTILE_STRIPE_WEBHOOK_URL = { description = "Launcher-owned integration target; use --target instead.", required = false }
  QUANTILE_CHECKOUT_TEST_ORIGIN = { description = "Launcher-owned Checkout test origin; never set before launch.", required = false }

  # Explicit remote-target tests; no local listener or sending key.
  [profiles.integration-target.defaults]
  providers = ["env"]

  [profiles.integration-target]
  STRIPE_EVENT_LIVEMODE = { description = "Must be false for target integration tests.", required = true }
  STRIPE_TEST_API_KEY = { description = "Development Stripe key for the reviewed target.", required = true }
  STRIPE_PRICE_ID = { description = "Reviewed development Stripe Price.", required = true }
  STRIPE_WEBHOOK_SECRET = { description = "Reviewed target Stripe endpoint signing secret.", required = true }
  RESEND_MANAGEMENT_API_KEY = { description = "Resend credential for verifying target delivery.", required = true }
  QUANTILE_APP_INSTANCE = { description = "Reviewed target application instance.", required = true }
  GCP_PROJECT_ID = { description = "Reviewed application database project, never the state project.", required = true }
  GOOGLE_APPLICATION_CREDENTIALS = { description = "Existing application ADC file path; optional for other ADC sources.", required = false }
  GOOGLE_CLOUD_QUOTA_PROJECT = { description = "Optional application ADC quota project.", required = false }

  [profiles.integration-cleanup.defaults]
  providers = ["env"]

  [profiles.integration-cleanup]
  RESEND_MANAGEMENT_API_KEY = { description = "Credential for explicitly approved owned-registration cleanup.", required = true }

  # Application runtime, not Terraform Apply or source publication.
  # Application validation enforces billing-mode/key agreement independently of NODE_ENV.
  [profiles.runtime.defaults]
  providers = ["env"]

  [profiles.runtime]
  STRIPE_API_KEY = { description = "Restricted Stripe Checkout key for the selected billing environment.", required = true }
  STRIPE_EVENT_LIVEMODE = { description = "Explicit billing mode: true for production, false for development.", required = true }
  STRIPE_PRICE_ID = { description = "Reviewed Stripe Price matching the selected account and billing environment.", required = true }
  STRIPE_WEBHOOK_SECRET = { description = "Application Stripe endpoint signing secret.", required = true }
  RESEND_API_KEY = { description = "Application email-sending credential.", required = true }
  RESEND_WEBHOOK_SECRET = { description = "Application Resend endpoint signing secret.", required = true }
  QUANTILE_APP_INSTANCE = { description = "Deployed application instance.", required = true }
  QUANTILE_SITE_ORIGIN = { description = "Reviewed application origin for Checkout returns.", required = true }
  QUANTILE_EMAIL_FROM = { description = "Application sender address.", required = true }
  QUANTILE_EMAIL_REPLY_TO = { description = "Application reply-to address.", required = true }
  GCP_PROJECT_ID = { description = "Application Firestore project, never the Terraform state project.", required = true }
  GOOGLE_APPLICATION_CREDENTIALS = { description = "Existing application ADC file path; optional for workload-provided ADC.", required = false }
  GOOGLE_CLOUD_QUOTA_PROJECT = { description = "Optional application ADC quota project.", required = false }
  NEXT_PUBLIC_FATHOM_SITE_ID = { description = "Optional public analytics site ID, consumed at build time.", required = false }
  NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS = { description = "Public analytics domains paired with the build-time site ID.", required = false }
  TOML
''
