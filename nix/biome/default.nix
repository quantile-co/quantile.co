{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "biome.json" (
    pkgs.writeText "biome.json" (
      builtins.toJSON (
        pkgs.lib.recursiveUpdate (builtins.fromJSON (builtins.readFile factory.biome.configFile)) {
          files.includes = [
            "**"
            "!node_modules"
            "!.next"
            "!dist"
            "!build"
            "!apps/web/components/**/*.module.css"
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
