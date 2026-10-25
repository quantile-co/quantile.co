{
  description = "Quantile marketing site";

  inputs = {
    factory.url = "github:quantile-co/factory/main";
    nixpkgs.follows = "factory/nixpkgs";
  };

  outputs =
    inputs:
    let
      lib = inputs.nixpkgs.lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      project =
        { config, pkgs, ... }:
        let
          factory = config.quantile-co.factory;
          agents = inputs.factory.inputs.llm-agents.packages.${pkgs.stdenv.hostPlatform.system};
          copy = source: {
            inherit source;
            mode = "copy";
          };
          site = import ./nix { inherit pkgs factory; };
        in
        {
          quantile-co.factory = {
            github.workflows = {
              layers = [ "infrastructure" ];
              build.layers = [ "application" ];
              plan.configFile = ./nix/github/workflows/state-freeze.yaml;
              apply.configFile = ./nix/github/workflows/state-migration.yaml;
            };
            flake.packages.direnv = pkgs.direnv;
            flake.devShell = {
              shellHook = lib.concatStringsSep "\n" [
                factory.files.shellHook
                factory.pi.shellHook
                ''
                  export NEXT_TELEMETRY_DISABLED=1
                  export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${factory.playwright.withVersion (builtins.fromJSON (builtins.readFile ./apps/web/package.json)).devDependencies.playwright}/bin/chromium-headless-shell"
                ''
              ];
              packages = [
                pkgs.bash
                pkgs.coreutils
                pkgs.diffutils
                pkgs.direnv
                pkgs.git
                pkgs.git-lfs
                pkgs.jq
                pkgs.nix
                pkgs.nodejs_24
                pkgs.pnpm
                pkgs.gh
                pkgs.google-cloud-sdk
                pkgs.opentofu
                pkgs.tflint
                pkgs.actionlint
                pkgs.gitleaks
                pkgs.semgrep
                pkgs.shellcheck
                pkgs.shfmt
                pkgs.taplo
                pkgs.trivy
                pkgs.typos
                pkgs.vale
                pkgs.yamllint
                pkgs.stripe-cli
                pkgs.ngrok
                pkgs.jdk21
                (factory.playwright.withVersion (builtins.fromJSON (builtins.readFile ./apps/web/package.json))
                  .devDependencies.playwright)
                factory.resend-cli.package
                agents.herdr
                agents.amp
                agents.hunk
                pkgs.clickhouse
                pkgs.tailscale
                factory.clickhousectl.package
                factory.langfuse.package
                factory.pi.package
                factory.qmd.package
                factory.prek.package
                factory.prek.tools.package
                factory.dependabot.check.package
                factory.prek.check.package
                factory.nixfmt.check.package
                factory.deadnix.check.package
                factory.statix.check.package
                factory.editorconfig.check.package
                factory.shellcheck.check.package
                factory.shfmt.check.package
                factory.markdownlint-cli2.check.package
                factory.actionlint.check.package
                factory.semgrep.test.package
                factory.semgrep.check.package
                factory.trivy.check.package
                factory.typos.check.package
                factory.vale.check.package
                factory.yamllint.check.package
                factory.taplo.check.package
                factory.taplo.format.package
                factory.opentofu.nonempty.package
                factory.opentofu.format.package
                factory.opentofu.check.package
                factory.tflint.check.package
                factory.opentofu.fix.package
                factory.nixfmt.fix.package
                factory.shfmt.fix.package
                factory.taplo.fix.package
                factory.editorconfig.fix.package
              ];
            };
            files.entries = {
              "README.md" = {
                source = factory.readme.withProject {
                  name = "quantile.co";
                  description = "Quantile marketing site";
                };
                mode = "seed";
              };
              "package.json" = {
                source = factory.pnpm.packageJsonFile;
                mode = "seed";
              };
              "pnpm-workspace.yaml" = {
                source = factory.pnpm.workspaceFile;
                mode = "seed";
              };
              "turbo.json" = {
                source = factory.turbo.configFile;
                mode = "seed";
              };
              "LICENSE" = copy factory.license.mitFile;
              "NOTICE.md" = copy factory.license.noticeFile;
              ".gitignore" = copy site.git.ignoreFile;
              ".envrc" = copy factory.direnv.configFile;
              ".husky/pre-push" = copy factory.husky.prePushFile;
              ".editorconfig" = copy factory.editorconfig.configFile;
              ".editorconfig-checker.json" = copy site.editorconfig.checker.configFile;
              ".markdownlint-cli2.jsonc" = copy factory.markdownlint-cli2.configFile;
              ".pre-commit-config.yaml" = copy factory.prek.configFile;
              ".gitleaks.toml" = copy factory.gitleaks.configFile;
              ".cz.toml" = copy factory.commitizen.configFile;
              ".shellcheckrc" = copy factory.shellcheck.configFile;
              ".tflint.hcl" = copy factory.tflint.configFile;
              "statix.toml" = copy (
                pkgs.writeText "statix.toml" ''
                  disabled = ["manual_inherit_from"]
                ''
              );
              "taplo.toml" = copy factory.taplo.configFile;
              "trivy.yaml" = copy factory.trivy.configFile;
              "typos.toml" = copy factory.typos.configFile;
              ".vale.ini" = copy site.vale.configFile;
              ".vale" = copy factory.vale.stylesDirectory;
              ".yamllint.yaml" = copy factory.yamllint.configFile;
              "biome.json" = copy site.biome.configFile;
              "knip.json" = copy site.knip.configFile;
              "apps/web/next.config.ts" = copy site.next.configFile;
              "apps/web/postcss.config.cjs" = copy site.postcss.configFile;
              "apps/web/vitest.config.mts" = copy site.vitest.configFile;
              "apps/web/tsconfig.json" = copy site.typescript.configFile;
              "apps/web/firebase.json" = copy site.firebase.configFile;
              "apps/web/firestore.rules" = copy site.firebase.rulesFile;
              "vitest.config.mts" = copy site.vitest.toolingConfigFile;
              "tsconfig.json" = copy (
                factory.typescript.withOverrides {
                  compilerOptions = {
                    module = "ESNext";
                    moduleResolution = "Bundler";
                    allowImportingTsExtensions = true;
                    types = [ "node" ];
                  };
                  include = [
                    "apps/github/**/*.ts"
                    "apps/repo/**/*.ts"
                  ];
                  exclude = [
                    "**/dist/**"
                    "**/node_modules/**"
                  ];
                }
              );
              ".github/actionlint.yaml" = copy factory.actionlint.configFile;
              ".github/workflows/check.yaml" = copy factory.github.workflows.check.configFile;
              ".github/workflows/test.yaml" = copy factory.github.workflows.test.configFile;
              ".github/workflows/build.yaml" = copy site.github.workflows.build.configFile;
              ".github/workflows/plan.yaml" = copy site.github.workflows.plan.configFile;
              ".github/workflows/apply.yaml" = copy site.github.workflows.apply.configFile;
              ".github/dependabot.yml" = copy site.dependabot.configFile;
              ".pi/settings.json" = copy factory.pi.settingsFile;
              ".qmd/index.yml" = {
                source = factory.qmd.configFile;
                mode = "seed";
              };
              ".semgrep/tf" = copy (factory.semgrep.rulesDir + "/tf");
              ".semgrep/tests/tf" = copy (factory.semgrep.test.fixturesDir + "/tf");
              ".semgrep/packs/typescript.yaml" = copy factory.semgrep.packs.typescript;
              ".semgrep/packs/terraform.yaml" = copy factory.semgrep.packs.terraform;
              ".semgrep/packs/github-actions.yaml" = copy factory.semgrep.packs.github-actions;
              ".semgrepignore" = copy factory.semgrep.ignoreFile;
            };
          };
        };
      configurations = lib.genAttrs systems (
        system:
        (lib.evalModules {
          specialArgs = {
            pkgs = import inputs.nixpkgs {
              inherit system;
              config.allowUnfree = true;
            };
            factoryInputs = inputs.factory.inputs;
          };
          modules = [
            inputs.factory.nixModules.default
            project
          ];
        }).config.quantile-co.factory.flake.outputs
      );
    in
    {
      packages = builtins.mapAttrs (_: configuration: configuration.packages) configurations;
      devShells = builtins.mapAttrs (_: configuration: configuration.devShells) configurations;
    };
}
