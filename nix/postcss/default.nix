{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "postcss.config.cjs" (
    pkgs.writeText "postcss.config.cjs" ''
      module.exports = ${
        builtins.toJSON {
          plugins = {
            postcss-preset-mantine = { };
            postcss-simple-vars.variables = {
              mantine-breakpoint-xs = "36em";
              mantine-breakpoint-sm = "48em";
              mantine-breakpoint-md = "62em";
              mantine-breakpoint-lg = "75em";
              mantine-breakpoint-xl = "88em";
            };
          };
        }
      };
    ''
  );
}
