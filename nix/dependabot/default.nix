{ pkgs, factory }:
{
  configFile = pkgs.writeText "dependabot.yml" (
    builtins.replaceStrings [ "directory: /tf/infrastructure" ] [ "directory: /tf" ] (
      builtins.readFile factory.dependabot.configFile
    )
  );
}
