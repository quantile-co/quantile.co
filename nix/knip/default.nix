{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "knip.json" (
    pkgs.writeText "knip.json" (
      builtins.toJSON (
        (builtins.fromJSON (builtins.readFile factory.knip.configFile))
        // {
          ignore = [ "lib/browser/test.tsx" ];
          ignoreDependencies = [ "@biomejs/biome" ];
        }
      )
    )
  );
}
