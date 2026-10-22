{ pkgs, factory }:
{
  configFile = pkgs.writeText ".envrc" (
    builtins.readFile factory.direnv.configFile
    + ''

      export NEXT_TELEMETRY_DISABLED=1
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$(command -v chromium-headless-shell)"
      export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ''
  );
}
