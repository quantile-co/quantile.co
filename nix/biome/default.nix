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
            "!components/**/*.module.css"
            "!!.pi/skills"
            "!!.pi/extensions"
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
    )
  );
}
