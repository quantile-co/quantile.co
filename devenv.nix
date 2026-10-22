{
  config,
  inputs,
  lib,
  pkgs,
  ...
}:
let
  exe = lib.getExe;
  biomeConfig = import ./nix/biome.nix { inherit config lib pkgs; };
  secretspecConfig = import ./nix/secretspec.nix { inherit config pkgs; };
  terraformRoot = "tf/infrastructure";
  firebaseHosting = builtins.fromJSON (builtins.readFile ./nix/firebase-hosting.json);
  knipTemplate = builtins.readFile config.quantile.knip.configFile;
  knipAnchor = "\"ignoreBinaries\": [\"nix\"]";
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
    inputs.this.nixModules.default
  ];

  cachix.pull = [
    "quantile-co"
    "cachix"
    "pre-commit-hooks"
    "go-overlay"
  ];

  packages = [
    config.quantile.bash.package
    config.quantile.coreutils.package
    config.quantile.diffutils.package
    config.quantile.python.package
    config.quantile.nix.package
    config.quantile.nodejs.package
    config.quantile.pnpm.package
    config.quantile.opentofu.package
    config.quantile.tflint.package
    config.quantile.github.workflows.plan.package
    config.quantile.github.workflows.apply.package
    config.quantile.github.workflows.public.build.package
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
    (config.quantile.playwright.withVersion (builtins.fromJSON (builtins.readFile ./package.json))
      .devDependencies.playwright)
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
    "tsconfig.json" = {
      source = config.quantile.typescript.withOverrides {
        compilerOptions = {
          target = "ES2017";
          lib = [
            "dom"
            "dom.iterable"
            "esnext"
          ];
          allowJs = true;
          allowImportingTsExtensions = true;
          esModuleInterop = true;
          module = "esnext";
          moduleResolution = "bundler";
          resolveJsonModule = true;
          isolatedModules = true;
          jsx = "react-jsx";
          incremental = true;
          plugins = [ { name = "next"; } ];
          paths."@/*" = [ "./*" ];
        };
        include = [
          "next-env.d.ts"
          "**/*.ts"
          "**/*.tsx"
          ".next/types/**/*.ts"
          ".next/dev/types/**/*.ts"
          "**/*.mts"
        ];
        exclude = [ "node_modules" ];
      };
      copyMode = "copy";
    };
    "firebase.json" = {
      source = config.quantile.firebase.withOverrides { hosting = firebaseHosting; };
      copyMode = "copy";
    };
    "firestore.rules" = {
      source = config.quantile.firebase.rulesFile;
      copyMode = "copy";
    };
    "knip.json" = {
      text =
        assert lib.assertMsg (lib.hasInfix knipAnchor knipTemplate)
          "Knip template no longer contains its patch point";
        lib.replaceStrings
          [ knipAnchor ]
          [
            ''
              "ignoreBinaries": ["nix"],
                "ignore": ["lib/browser/test.tsx"]''
          ]
          knipTemplate;
    };
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
    ".github/workflows/check.yaml" = {
      source = config.quantile.github.workflows.check.configFile;
      copyMode = "copy";
    };
    ".github/workflows/test.yaml" = {
      source = config.quantile.github.workflows.test.configFile;
      copyMode = "copy";
    };
    ".github/workflows/build.yaml" = {
      text = config.quantile.github.workflows.public.build.text;
      copyMode = "copy";
    };
    ".github/workflows/plan.yaml" = {
      text = config.quantile.github.workflows.public.plan.text;
      copyMode = "copy";
    };
    ".github/workflows/apply.yaml" = {
      text = config.quantile.github.workflows.public.apply.text;
      copyMode = "copy";
    };
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
        "test:integration"
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
        ${exe inputs.factory.packages.${pkgs.stdenv.hostPlatform.system}.check-devenv-locks}
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

    "test:integration" = {
      description = "Run provider-backed integration tests.";
      exec = "${exe config.quantile.pnpm.package} run test:integration";
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

  };
}
