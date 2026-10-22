{ pkgs, factory }:
{
  # The approved lowercase brand name is an HTML h1, not a prose heading.
  configFile = pkgs.writeText ".vale.ini" (
    builtins.replaceStrings
      [ "SkippedScopes = script, style, pre, figure" ]
      [ "SkippedScopes = script, style, pre, figure, h1" ]
      (builtins.readFile factory.vale.configFile)
  );
}
