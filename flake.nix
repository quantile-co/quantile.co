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
          copy = source: {
            inherit source;
            mode = "copy";
          };
          # Extend native JSON defaults, then format the copied files with pinned Biome.
          format =
            name: source:
            pkgs.runCommand name { nativeBuildInputs = [ pkgs.biome ]; } ''
              biome format --indent-style=space --indent-width=2 --stdin-file-path ${name} < ${source} > "$out"
            '';
          json = name: value: format name (pkgs.writeText name (builtins.toJSON value));
          readJson = source: builtins.fromJSON (builtins.readFile source);
          # Preserve the existing production concurrency and GitHub variable names.
          infrastructureWorkflow =
            name:
            let
              source = builtins.readFile factory.github.workflows.${name}.configFile;
              from = [
                "group: factory-production"
                "GCP_TF_STATE_BUCKET: \${{ vars.GCP_TF_STATE_BUCKET }}"
                "TF_VAR_gcp_folder_id: \${{ vars.GCP_FOLDER_ID }}"
              ];
              to = [
                "group: site-production"
                "GCP_TF_STATE_BUCKET: \${{ vars.TF_STATE_BUCKET }}"
                "TF_VAR_gcp_folder_id: \${{ vars.GCP_QUANTILE_CO_FOLDER_ID }}"
              ];
            in
            assert pkgs.lib.assertMsg (pkgs.lib.all (
              text: pkgs.lib.hasInfix text source
            ) from) "Site workflow template no longer contains its expected patch points";
            pkgs.writeText "${name}.yaml" (builtins.replaceStrings from to source);
          dependabotFile = pkgs.writeText "dependabot.yml" (
            builtins.replaceStrings [ "directory: /tf/infrastructure" ] [ "directory: /tf" ] (
              builtins.readFile factory.dependabot.configFile
            )
          );
          # Keep the template's YAML nesting when inserting multiline release-only steps.
          indent =
            prefix: text:
            pkgs.lib.concatMapStringsSep "\n" (line: if line == "" then "" else prefix + line) (
              pkgs.lib.splitString "\n" text
            );
          # Build publishes only the reviewed tag/release; GitHub supplies the source archive.
          buildWorkflow = pkgs.writeText "build.yaml" (
            let
              source = builtins.readFile factory.github.workflows.build.configFile;
              from = [
                "  workflow_dispatch:\n"
                "    name: All\n    if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'\n"
                "      - name: Check out repository\n"
                "          persist-credentials: false\n"
                "      - name: Build\n"
              ];
              to = [
                (indent "  " ''
                  workflow_dispatch:
                    inputs:
                      app_sha:
                        description: Reviewed 40-character public application commit
                        required: true
                        type: string
                      check_run_id:
                        description: Successful exact-source public Check run; source must be on main
                        required: true
                        type: string
                      version:
                        description: Reviewed application release version (for example v0.1.0)
                        required: true
                        type: string
                '')
                (indent "    " ''
                  name: Build
                  if: >-
                    github.event_name == 'workflow_dispatch' &&
                    github.ref == 'refs/heads/main' &&
                    contains(fromJSON(vars.GH_MAINTAINERS), github.actor) &&
                    contains(fromJSON(vars.GH_MAINTAINERS), github.triggering_actor)
                  concurrency:
                    group: source-release
                    cancel-in-progress: false
                  permissions:
                    actions: read
                    contents: write
                '')
                "      - name: Check out trusted release tooling\n"
                (indent "      " ''
                      ref: ''${{ github.sha }}
                      path: tooling
                      persist-credentials: false

                  - name: Check out candidate source
                    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
                    with:
                      ref: ''${{ inputs.app_sha }}
                      path: source
                      persist-credentials: false
                '')
                (indent "      " ''
                  - name: Publish reviewed source release
                    working-directory: tooling
                    env:
                      SOURCE_DIR: ''${{ github.workspace }}/source
                      APP_SHA: ''${{ inputs.app_sha }}
                      CHECK_RUN_ID: ''${{ inputs.check_run_id }}
                      RELEASE_VERSION: ''${{ inputs.version }}
                      GH_TOKEN: ''${{ github.token }}
                '')
              ];
            in
            assert pkgs.lib.assertMsg (pkgs.lib.all (
              text: pkgs.lib.hasInfix text source
            ) from) "Source release Build template lost a patch point";
            builtins.replaceStrings from to source
          );
          # The approved lowercase brand name is an HTML h1, not a prose heading.
          valeConfig = pkgs.writeText ".vale.ini" (
            builtins.replaceStrings
              [ "SkippedScopes = script, style, pre, figure" ]
              [ "SkippedScopes = script, style, pre, figure, h1" ]
              (builtins.readFile factory.vale.configFile)
          );
          # Repo-specific framework configs are copied too; they resolve local npm imports.
          nextConfig = pkgs.writeText "next.config.ts" ''
            import type { NextConfig } from "next";
            import {
              readDevelopmentPortalUrl,
              readHeaderSettings,
              runtimeEnvironment,
            } from "./lib/env/env";
            import { siteHeaders } from "./lib/http/headers";

            const portalUrl = readDevelopmentPortalUrl(runtimeEnvironment());
            const nextConfig: NextConfig = {
              compiler: {
                define: portalUrl ? { QUANTILE_DEVELOPMENT_PORTAL_URL: portalUrl } : {},
              },
              async headers() {
                return siteHeaders(readHeaderSettings(runtimeEnvironment()));
              },
              images: { unoptimized: true },
              experimental: {
                optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
              },
            };

            export default nextConfig;
          '';
          postcssConfig = pkgs.writeText "postcss.config.cjs" ''
            module.exports = {
              plugins: {
                "postcss-preset-mantine": {},
                "postcss-simple-vars": {
                  variables: {
                    "mantine-breakpoint-xs": "36em",
                    "mantine-breakpoint-sm": "48em",
                    "mantine-breakpoint-md": "62em",
                    "mantine-breakpoint-lg": "75em",
                    "mantine-breakpoint-xl": "88em",
                  },
                },
              },
            };
          '';
          vitestConfig = pkgs.writeText "vitest.config.mts" ''
            import path from "node:path";
            import { fileURLToPath } from "node:url";
            import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
            import { playwright } from "@vitest/browser-playwright";
            import { defineConfig } from "vitest/config";

            const dirname = path.dirname(fileURLToPath(import.meta.url));
            const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
            if (!executablePath) {
              throw new Error("Enter the direnv shell to use the pinned Playwright browser.");
            }
            const browser = () => ({
              enabled: true,
              headless: true,
              provider: playwright({ launchOptions: { executablePath } }),
              instances: [{ browser: "chromium" as const }],
            });

            export default defineConfig({
              resolve: { alias: { "@": dirname } },
              test: {
                projects: [
                  {
                    extends: true,
                    test: {
                      name: "unit",
                      environment: "node",
                      include: [
                        "app/**/*.test.{ts,tsx}",
                        "components/**/*.test.{ts,tsx}",
                        "lib/**/*.test.{ts,tsx}",
                      ],
                      exclude: ["**/*.integration.test.{ts,tsx}", "**/*.browser.test.{ts,tsx}"],
                    },
                  },
                  {
                    extends: true,
                    test: {
                      name: "integration",
                      environment: "node",
                      include: ["app/**/*.integration.test.{ts,tsx}"],
                      fileParallelism: false,
                    },
                  },
                  {
                    extends: true,
                    optimizeDeps: { include: ["react-dom/server", "react-email"] },
                    plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
                    test: { name: "storybook", browser: browser() },
                  },
                  {
                    extends: true,
                    resolve: { alias: { "next/image": path.join(dirname, "lib/browser/test.tsx") } },
                    optimizeDeps: {
                      include: ["@mantine/hooks", "@tabler/icons-react", "fathom-client", "next/navigation", "react-dom/client"],
                    },
                    test: {
                      name: "browser",
                      include: ["app/**/*.browser.test.tsx", "components/**/*.browser.test.tsx"],
                      browser: browser(),
                    },
                  },
                ],
              },
            });
          '';
          # The browser must match npm's exact Playwright version, including consumer overrides.
          browser = factory.playwright.withVersion (readJson ./package.json).devDependencies.playwright;
          # Extend Factory's safety exclusions with application output and local credentials.
          gitignore = pkgs.writeText ".gitignore" (
            builtins.readFile "${inputs.factory}/.gitignore"
            + ''

              # Application build output, local credentials and emulator state.
              /.quantile/
              /firebase-debug.log
              /firestore-debug.log
              /ui-debug.log
              /.pnpm-store/
              /.next/
              /out/
              /build/
              /storybook-static/
              /coverage/
              **/__screenshots__/
              /.vitest-attachments/
              .DS_Store
              *.pem
              *-debug.log*
              .env*
              !.envrc
              *.tsbuildinfo
              next-env.d.ts
            ''
          );
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
              ++ [ browser ]
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
              ".gitignore" = copy gitignore;
              ".editorconfig" = copy factory.editorconfig.configFile;
              ".editorconfig-checker.json" = copy (
                json ".editorconfig-checker.json" (
                  let
                    base = readJson factory.editorconfig.checker.configFile;
                  in
                  base
                  // {
                    Exclude = base.Exclude ++ [
                      "^\\.pi/skills/"
                      "^public/images/logos/"
                    ];
                  }
                )
              );
              ".markdownlint-cli2.jsonc" = copy factory.markdownlint-cli2.configFile;
              ".pre-commit-config.yaml" = copy factory.prek.configFile;
              ".cz.toml" = copy factory.commitizen.configFile;
              ".shellcheckrc" = copy factory.shellcheck.configFile;
              ".tflint.hcl" = copy factory.tflint.configFile;
              "taplo.toml" = copy factory.taplo.configFile;
              "trivy.yaml" = copy factory.trivy.configFile;
              "typos.toml" = copy factory.typos.configFile;
              ".vale.ini" = copy valeConfig;
              ".vale/styles" = copy factory.vale.stylesDirectory;
              ".yamllint.yaml" = copy factory.yamllint.configFile;
              "next.config.ts" = copy (format "next.config.ts" nextConfig);
              "postcss.config.cjs" = copy (format "postcss.config.cjs" postcssConfig);
              "vitest.config.mts" = copy (format "vitest.config.mts" vitestConfig);
              "biome.json" = copy (
                json "biome.json" (
                  pkgs.lib.recursiveUpdate (readJson factory.biome.configFile) {
                    files.includes = [
                      "**"
                      "!node_modules"
                      "!.next"
                      "!dist"
                      "!build"
                      "!components/**/*.module.css"
                      "!!.pi/skills"
                      "!!.semgrep"
                    ];
                    formatter.indentWidth = 2;
                    linter = {
                      rules.style.noProcessEnv = "error";
                      rules.suspicious.noImportCycles = "error";
                      domains = {
                        next = "recommended";
                        react = "recommended";
                      };
                    };
                    assist.actions.source.organizeImports = "on";
                    overrides = [
                      {
                        includes = [
                          "app/**/route.ts"
                          "app/**/page.tsx"
                          "app/**/layout.tsx"
                          "lib/**/run.ts"
                          "lib/env/env.ts"
                          "scripts/pnpm/*.ts"
                          "lib/release/*.test.ts"
                          "**/*.test.{ts,tsx}"
                          "**/test.ts"
                          "**/*.config.{ts,js,mjs,cjs,mts,cts}"
                        ];
                        linter.rules.style.noProcessEnv = "off";
                      }
                      {
                        includes = [
                          "lib/**/*.{ts,tsx}"
                          "!lib/**/run.ts"
                          "!lib/**/*.test.{ts,tsx}"
                          "!lib/**/test.ts"
                        ];
                        linter.rules.style.noRestrictedImports = {
                          level = "error";
                          options.patterns = [
                            {
                              group = [
                                "@/app/**"
                                "**/route"
                                "**/route.ts"
                                "**/run"
                                "**/run.ts"
                              ];
                              message = "Library modules must not import application entrypoints. Inject dependencies from the composition root.";
                            }
                          ];
                        };
                      }
                      {
                        includes = [ "components/**/*.{ts,tsx}" ];
                        linter.rules.style.noRestrictedImports = {
                          level = "error";
                          options.patterns = [
                            {
                              group = [
                                ".."
                                "../**"
                                "@/**"
                              ];
                              message = "Components must remain standalone. Inject app code and sibling components through props in app/.";
                            }
                          ];
                        };
                      }
                    ];
                  }
                )
              );
              "tsconfig.json" = copy (
                factory.typescript.withOverrides {
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
                }
              );
              "knip.json" = copy (
                json "knip.json" (
                  readJson factory.knip.configFile
                  // {
                    ignore = [ "lib/browser/test.tsx" ];
                    ignoreDependencies = [ "@biomejs/biome" ];
                  }
                )
              );
              "firebase.json" = copy (
                format "firebase.json" (
                  factory.firebase.withOverrides {
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
                  }
                )
              );
              "firestore.rules" = copy factory.firebase.rulesFile;
              ".github/actionlint.yaml" = copy factory.actionlint.configFile;
              ".github/workflows/check.yaml" = copy factory.github.workflows.check.configFile;
              ".github/workflows/test.yaml" = copy factory.github.workflows.test.configFile;
              ".github/workflows/build.yaml" = copy buildWorkflow;
              ".github/workflows/plan.yaml" = copy (infrastructureWorkflow "plan");
              ".github/workflows/apply.yaml" = copy (infrastructureWorkflow "apply");
              ".github/dependabot.yml" = copy dependabotFile;
              ".pi/settings.json" = copy (json "settings.json" (readJson factory.pi.settingsFile));
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
