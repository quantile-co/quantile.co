{ pkgs, factory }:
let
  base = builtins.fromJSON (builtins.readFile factory.biome.configFile);
in
{
  configFile = factory.biome.formatFile "biome.json" (
    pkgs.writeText "biome.json" (
      builtins.toJSON (
        pkgs.lib.recursiveUpdate base {
          files.includes = [
            "**"
            "!node_modules"
            "!.next"
            "!dist"
            "!build"
            "!!.pi/skills"
            "!!.semgrep"
            "!!.biome"
            "!**/*.{yml,yaml}"
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
          overrides = base.overrides ++ [
            {
              includes = [ "apps/web/components/ThemeSwitcher/ThemeSwitcher.module.css" ];
              linter.rules.suspicious.noUnknownAtRules = {
                level = "error";
                options.ignore = [ "mixin" ];
              };
            }
            {
              includes = [
                "apps/web/app/**/page.tsx"
                "apps/web/app/**/layout.tsx"
                "apps/web/components/FathomAnalytics/FathomAnalytics.tsx"
                "apps/*/cli.ts"
                "**/*.test.{ts,tsx}"
                "**/test.ts"
                "**/*.config.{ts,js,mjs,cjs,mts,cts}"
              ];
              linter.rules.style.noProcessEnv = "off";
            }
            {
              includes = [ "apps/web/components/**/*.{ts,tsx}" ];
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
    )
  );
}
