{
  description = "Quantile marketing site";

  inputs = {
    factory.url = "github:quantile-co/factory/136c0975625d5246dbbaca59e9a123e33e30b789";
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
          tailscale = inputs.factory.packages.${pkgs.stdenv.hostPlatform.system}.tailscale;
          copy = source: {
            inherit source;
            mode = "copy";
          };
          site = import ./nix { inherit pkgs factory; };
        in
        {
          quantile-co.factory = {
            hindsight.bankId = "quantile-co--quantile-co";
            github.workflows = {
              layers = [ "infrastructure" ];
              otelJobs = [ "test" ];
              otelActionRef = "38aedb9583cdd78d121f949ff94f603982f39eee";
              hindsight = true;
              build.layers = [ "application" ];
            };
            flake.packages.direnv = pkgs.direnv;
            flake.devShell = {
              shellHook = lib.concatStringsSep "\n" [
                factory.files.shellHook
                factory.hindsight.shellHook
                ''
                  export OTEL_COLLECTOR_BINARY="${factory.otelcol-contrib.package}/bin/otelcol-contrib"
                  export OTEL_COLLECTOR_CONFIG="${factory.otelcol-contrib.hostConfigFile}"
                  export OTEL_COLLECTOR_DOCKER_CONFIG="${factory.otelcol-contrib.dockerConfigFile}"
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
                pkgs.openssh
                tailscale
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
                (factory.playwright.withVersion (builtins.fromJSON (builtins.readFile ./apps/web/package.json))
                  .devDependencies.playwright)
                agents.herdr
                agents.amp
                agents.antigravity-cli
                agents.hunk
                factory.otelcol-contrib.package
                factory.langfuse.package
                factory.pi.package
                factory.hindsight.package
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
                    "apps/amp/**/*.ts"
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
              ".pi/settings.json" = copy (
                factory.biome.formatFile "settings.json" factory.hindsight.piSettingsFile
              );
              ".pi/hindsight.json" = copy (
                factory.biome.formatFile "hindsight.json" factory.hindsight.configFile
              );
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
