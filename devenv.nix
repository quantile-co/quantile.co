{
  config,
  inputs,
  lib,
  pkgs,
  ...
}:
let
  exe = lib.getExe;
  biomeConfig = pkgs.runCommand "biome.json" { } ''
    set -euo pipefail
    ${exe pkgs.jq} '
      .files.includes = ["**", "!node_modules", "!.next", "!dist", "!build", "!components/**/*.module.css"] +
        [.files.includes[] | select(startswith("!"))] |
      .formatter.indentWidth = 2 |
      .linter.rules.style.noProcessEnv = "error" |
      .linter.rules.suspicious.noImportCycles = "error" |
      .linter.domains = {next: "recommended", react: "recommended"} |
      .assist.actions.source.organizeImports = "on" |
      .overrides = [
        {
          includes: [
            "app/**/route.ts", "app/**/page.tsx", "app/**/layout.tsx",
            "scripts/**/*.ts", "lib/**/run.ts", "lib/env/env.ts",
            "**/*.test.{ts,tsx}", "**/test.ts", "**/*.config.{ts,js,mjs,cjs,mts,cts}"
          ],
          linter: {rules: {style: {noProcessEnv: "off"}}}
        },
        {
          includes: ["lib/**/*.{ts,tsx}", "!lib/**/run.ts", "!lib/**/*.test.{ts,tsx}", "!lib/**/test.ts"],
          linter: {rules: {style: {noRestrictedImports: {
            level: "error",
            options: {patterns: [{
              group: ["@/app/**", "@/scripts/**", "**/scripts/**", "**/route", "**/route.ts", "**/run", "**/run.ts"],
              message: "Library modules must not import application entrypoints. Inject dependencies from the composition root."
            }]}
          }}}}
        },
        {
          includes: ["components/**/*.{ts,tsx}"],
          linter: {rules: {style: {noRestrictedImports: {
            level: "error",
            options: {patterns: [{
              group: ["..", "../**", "@/**"],
              message: "Components must remain standalone. Inject app code and sibling components through props in app/."
            }]}
          }}}}
        }
      ]
    ' ${config.quantile.biome.configFile} |
      ${exe pkgs.biome} format --stdin-file-path=biome.json --indent-style=space --indent-width=2 > "$out"
  '';
  secretspecConfig = pkgs.runCommand "secretspec.toml" { } ''
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
  '';
  terraformRoot = "tf/infrastructure";
  dependabotFile = config.quantile.dependabot.withUpdates [
    "github-actions"
    "npm"
    "opentofu"
    "nix"
  ];
in
{
  imports = [
    inputs.factory.nixModules.default
    inputs.factory.devenvModules.files
  ];

  cachix.pull = [
    "quantile-co"
    "cachix"
    "pre-commit-hooks"
    "go-overlay"
  ];

  packages = [
    # Temporary encrypted first-plan handoff; remove after reader access is applied.
    config.quantile.age.package
    config.quantile.bash.package
    config.quantile.coreutils.package
    config.quantile.diffutils.package
    config.quantile.python.package
    config.quantile.nix.package
    config.quantile.nodejs.package
    config.quantile.pnpm.package
    config.quantile.opentofu.package
    config.quantile.tflint.package
    config.quantile.gcloud.package
    config.quantile.gh.package
    config.quantile.git.package
    config.quantile.git.lfs.package
    config.quantile.git.prePush.package
    config.quantile.prek.package
    config.quantile.prek.tools.package
    config.quantile.actionlint.package
    config.quantile.shellcheck.package
    config.quantile.jq.package
    config.quantile.pi.package
    config.quantile.qmd.package
    config.quantile.semgrep.package
    config.quantile.secretspec.package
    config.quantile.nixfmt.package
    config.quantile.stripe-cli.package
    config.quantile.ngrok.package
    config.quantile.resend-cli.package
    (
      assert lib.assertMsg (
        config.quantile.playwright.package.playwrightVersion
        == (builtins.fromJSON (builtins.readFile ./package.json)).devDependencies.playwright
      ) "The npm Playwright version must match Factory's pinned browser.";
      config.quantile.playwright.package
    )
    pkgs.jdk21
  ];

  quantile.semgrep.check.configs = lib.attrVals [
    "javascript"
    "owasp-top-ten"
    "secrets"
    "security-audit"
    "terraform"
    "typescript"
  ] config.quantile.semgrep.packs;

  env = {
    SECRETSPEC_FILE = "${secretspecConfig}";
    NEXT_TELEMETRY_DISABLED = "1";
    # The locked Playwright client uses the Nix browser without a second download.
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = exe config.quantile.playwright.package;
  };
  enterShell = lib.mkBefore config.quantile.secretspec.shellHook;

  files = {
    "secretspec.toml".source = secretspecConfig;
    ".editorconfig".source = config.quantile.editorconfig.configFile;
    ".editorconfig-checker.json".source = config.quantile.editorconfig.checker.configFile;
    ".pre-commit-config.yaml".source = config.quantile.prek.configFile;
    ".cz.toml".source = config.quantile.commitizen.configFile;
    ".shellcheckrc".source = config.quantile.shellcheck.configFile;
    ".tflint.hcl".source = config.quantile.tflint.configFile;
    # Biome 2.5.15 panics when its root config is a symlink (upstream #12158).
    "biome.json" = {
      source = biomeConfig;
      copyMode = "copy";
    };
    ".github/actionlint.yaml".source = config.quantile.actionlint.configFile;
    # GitHub consumes the tracked copy, not a Nix-store link.
    ".github/dependabot.yml" = {
      source = dependabotFile;
      copyMode = "copy";
    };
    ".pi/settings.json".source = config.quantile.pi.settingsFile;
    ".pi/skills/devenv-tasks".source = config.quantile.pi.skillsDir + "/devenv-tasks";
    ".pi/skills/deploy".source = config.quantile.pi.skillsDir + "/deploy";
    ".pi/skills/day-zero-deploy".source = config.quantile.pi.skillsDir + "/day-zero-deploy";
    ".pi/skills/seo-audit".source = config.quantile.pi.skillsDir + "/seo-audit";
    ".pi/skills/web-design-guidelines".source = config.quantile.pi.skillsDir + "/web-design-guidelines";
    ".pi/skills/web-perf".source = config.quantile.pi.skillsDir + "/web-perf";
    ".pi/skills/web-quality-audit".source = config.quantile.pi.skillsDir + "/web-quality-audit";
    ".pi/skills/webapp-testing".source = config.quantile.pi.skillsDir + "/webapp-testing";
    ".pi/skills/performance/references".source =
      config.quantile.pi.skillsDir + "/performance/references";
    ".qmd/index.yml".source = config.quantile.qmd.configFile;
    ".semgrep".source = config.quantile.semgrep.rulesDir;
    ".semgrepignore".source = config.quantile.semgrep.ignoreFile;
  };

  tasks = {
    "install:git:hooks" = {
      description = "Install Git hooks.";
      after = [ "devenv:files" ];
      exec = exe config.quantile.git.prePush.install.package;
    };

    "install:dependencies" = {
      description = "Install dependencies.";
      after = [ "devenv:files" ];
      before = [
        "check:all"
        "fix:all"
        "test:all"
        "build:assets"
        "build:all"
        "dev:app"
        "dev:storybook"
      ];
      exec = "${exe config.quantile.pnpm.package} install --frozen-lockfile --ignore-scripts";
    };

    "dev:app" = {
      description = "Start the application.";
      exec = "${exe config.quantile.pnpm.package} run dev";
    };

    "dev:storybook" = {
      description = "Start Storybook.";
      exec = "${exe config.quantile.pnpm.package} run storybook";
    };

    "check:all" = {
      description = "Run all checks.";
      exec = ''
        set -euo pipefail
        ${exe pkgs.nix} flake check .
        ${exe config.quantile.dependabot.check.package} ${dependabotFile}
        ${
          exe inputs.factory.packages.${pkgs.stdenv.hostPlatform.system}.check-devenv-locks
        } --ci --flake-input factory flake.lock devenv.lock factory
        ${exe config.quantile.prek.check.package}
        ${exe config.quantile.nixfmt.check.package}
        ${exe config.quantile.deadnix.check.package}
        ${exe config.quantile.statix.check.package}
        ${exe config.quantile.actionlint.check.package}
        ${exe config.quantile.semgrep.check.package}
        ${exe config.quantile.opentofu.nonempty.package} tf
        TF_DIR=tf ${exe config.quantile.opentofu.format.package}
        TF_DIR=${terraformRoot} ${exe config.quantile.opentofu.check.package}
        TF_DIR=${terraformRoot} ${exe config.quantile.tflint.check.package}
        ${exe config.quantile.pnpm.package} run check
      '';
    };

    "fix:all" = {
      description = "Run all fixes.";
      after = [ "devenv:files" ];
      exec = ''
        set -euo pipefail
        TF_DIR=tf ${exe config.quantile.opentofu.fix.package}
        ${exe config.quantile.nixfmt.fix.package}
        ${exe config.quantile.pnpm.package} run format
      '';
    };

    "test:all" = {
      description = "Run all tests.";
      after = [ "check:all" ];
      exec = ''
        set -euo pipefail
        ${exe config.quantile.semgrep.test.package}
        ${exe config.quantile.pnpm.package} run test
      '';
    };

    "build:assets" = {
      description = "Build assets.";
      before = [ "build:all" ];
      exec = "${exe config.quantile.pnpm.package} run assets:generate";
    };

    "build:all" = {
      description = "Build the application and Storybook.";
      after = [ "devenv:files" ];
      exec = ''
        set -euo pipefail
        ${exe config.quantile.pnpm.package} run build
        ${exe config.quantile.pnpm.package} run storybook:build
      '';
    };

    "plan:infrastructure" = {
      description = "Plan infrastructure.";
      env.TF_DIR = terraformRoot;
      exec = exe config.quantile.opentofu.plan.gcs.package;
    };
    "apply:infrastructure" = {
      description = "Apply infrastructure.";
      env.TF_DIR = terraformRoot;
      exec = exe config.quantile.opentofu.apply.gcs.package;
    };
  };
}
