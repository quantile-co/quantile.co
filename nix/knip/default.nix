{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "knip.json" (
    pkgs.writeText "knip.json" (
      builtins.toJSON {
        "$schema" = "https://unpkg.com/knip@6/schema.json";
        workspaces = {
          "." = {
            ignoreDependencies = [
              "@biomejs/biome"
              "@quantile-co/factory-pi"
            ];
          };
          "apps/web" = {
            ignore = [ "lib/browser/test.tsx" ];
          };
          "apps/github" = {
            ignoreBinaries = [ "tofu" ];
          };
        };
      }
    )
  );
}
