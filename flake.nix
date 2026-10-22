{
  description = "Quantile marketing site";

  # Moving refs propose updates; flake.lock fixes exact revisions.
  inputs = {
    factory.url = "github:quantile-co/factory/main";
    nixpkgs.follows = "factory/nixpkgs";
  };

  outputs =
    inputs:
    let
      inherit (inputs) factory;
    in
    factory.lib.mkFlake {
      inherit (inputs) nixpkgs;
      modules = [ factory.nixModules.default ];
      nixpkgsConfig.allowUnfree = true;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        { pkgs, factory }:
        let
          site = import ./nix { inherit inputs pkgs factory; };
          copy = source: {
            inherit source;
            mode = "copy";
          };
        in
        {
          # Public flake packages for workflow entry points.
          packages = {
            inherit (pkgs) direnv;
            github-workflow-plan = factory.github.workflows.plan.package;
            github-workflow-apply = factory.github.workflows.apply.package;
          };

          # Only tools and configuration used to develop this repository.
          devShell = {
            packages =
              (with pkgs; [
                bash
                coreutils
                diffutils
                direnv
                git
                git-lfs
                jq
                nix
                nodejs_24
                pnpm
                gh
                google-cloud-sdk
                opentofu
                tflint
                actionlint
                semgrep
                shellcheck
                shfmt
                taplo
                trivy
                typos
                vale
                yamllint
                stripe-cli
                ngrok
                jdk21
              ])
              ++ [
                (factory.playwright.withVersion (builtins.fromJSON (builtins.readFile ./package.json))
                  .devDependencies.playwright)
              ]
              ++ (with factory; [
                pi.package
                qmd.package
                prek.package
                prek.tools.package
                resend-cli.package
                dependabot.check.package
                prek.check.package
                nixfmt.check.package
                deadnix.check.package
                statix.check.package
                editorconfig.check.package
                shellcheck.check.package
                shfmt.check.package
                markdownlint-cli2.check.package
                actionlint.check.package
                semgrep.test.package
                semgrep.check.package
                trivy.check.package
                typos.check.package
                vale.check.package
                yamllint.check.package
                taplo.check.package
                taplo.format.package
                opentofu.nonempty.package
                opentofu.format.package
                opentofu.check.package
                tflint.check.package
                opentofu.fix.package
                nixfmt.fix.package
                shfmt.fix.package
                taplo.fix.package
                editorconfig.fix.package
              ]);

            # Committed regular files; direnv refreshes copy entries on shell entry.
            files = {
              ".gitignore" = copy site.git.ignoreFile;
              ".editorconfig" = copy factory.editorconfig.configFile;
              ".editorconfig-checker.json" = copy site.editorconfig.checker.configFile;
              ".markdownlint-cli2.jsonc" = copy factory.markdownlint-cli2.configFile;
              ".pre-commit-config.yaml" = copy factory.prek.configFile;
              ".cz.toml" = copy factory.commitizen.configFile;
              ".shellcheckrc" = copy factory.shellcheck.configFile;
              ".tflint.hcl" = copy factory.tflint.configFile;
              "taplo.toml" = copy factory.taplo.configFile;
              "trivy.yaml" = copy factory.trivy.configFile;
              "typos.toml" = copy factory.typos.configFile;
              ".vale.ini" = copy site.vale.configFile;
              ".vale/styles" = copy factory.vale.stylesDirectory;
              ".yamllint.yaml" = copy factory.yamllint.configFile;
              "next.config.ts" = copy site.next.configFile;
              "postcss.config.cjs" = copy site.postcss.configFile;
              "vitest.config.mts" = copy site.vitest.configFile;
              "biome.json" = copy site.biome.configFile;
              "tsconfig.json" = copy site.typescript.configFile;
              "knip.json" = copy site.knip.configFile;
              "firebase.json" = copy site.firebase.configFile;
              "firestore.rules" = copy factory.firebase.rulesFile;
              ".github/actionlint.yaml" = copy factory.actionlint.configFile;
              ".github/workflows/check.yaml" = copy factory.github.workflows.check.configFile;
              ".github/workflows/test.yaml" = copy factory.github.workflows.test.configFile;
              ".github/workflows/build.yaml" = copy site.github.workflows.build.configFile;
              ".github/workflows/plan.yaml" = copy site.github.workflows.plan.configFile;
              ".github/workflows/apply.yaml" = copy site.github.workflows.apply.configFile;
              ".github/dependabot.yml" = copy site.dependabot.configFile;
              ".pi/settings.json" = copy site.pi.settingsFile;
              ".pi/skills/deploy" = copy (factory.pi.skillsDir + "/deploy");
              ".pi/skills/day-zero-deploy" = copy (factory.pi.skillsDir + "/day-zero-deploy");
              ".pi/skills/seo-audit" = copy (factory.pi.skillsDir + "/seo-audit");
              ".pi/skills/web-design-guidelines" = copy (factory.pi.skillsDir + "/web-design-guidelines");
              ".pi/skills/web-perf" = copy (factory.pi.skillsDir + "/web-perf");
              ".pi/skills/web-quality-audit" = copy (factory.pi.skillsDir + "/web-quality-audit");
              ".pi/skills/webapp-testing" = copy (factory.pi.skillsDir + "/webapp-testing");
              ".pi/skills/performance/references" = copy (factory.pi.skillsDir + "/performance/references");
              ".qmd/index.yml" = copy factory.qmd.configFile;
              ".semgrep/tf" = copy (factory.semgrep.rulesDir + "/tf");
              ".semgrep/packs/typescript.yaml" = copy factory.semgrep.packs.typescript;
              ".semgrep/packs/terraform.yaml" = copy factory.semgrep.packs.terraform;
              ".semgrep/packs/github-actions.yaml" = copy factory.semgrep.packs.github-actions;
              ".semgrepignore" = copy factory.semgrep.ignoreFile;
            };
          };
        };
    };
}
