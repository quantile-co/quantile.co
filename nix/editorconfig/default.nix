{ pkgs, factory }:
let
  base = builtins.fromJSON (builtins.readFile factory.editorconfig.checker.configFile);
in
{
  checker.configFile = factory.biome.formatFile ".editorconfig-checker.json" (
    pkgs.writeText ".editorconfig-checker.json" (
      builtins.toJSON (
        base
        // {
          Exclude = base.Exclude ++ [
            "^\\.pi/skills/"
            "^public/images/logos/"
          ];
        }
      )
    )
  );
}
