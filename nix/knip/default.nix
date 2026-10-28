{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "knip.json" (
    pkgs.writeText "knip.json" (
      builtins.toJSON {
        "$schema" = "https://unpkg.com/knip@6/schema.json";
        workspaces = {
          "packages/brand" = {
            # The executable bin uses tsx through its shebang.
            ignoreDependencies = [ "tsx" ];
          };
          "." = {
            ignoreDependencies = [
              "@biomejs/biome"
              "@quantile-co/factory-pi"
            ];
          };
        };
      }
    )
  );
}
