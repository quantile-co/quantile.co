{ pkgs, factory }:
{
  configFile = factory.biome.formatFile "postcss.config.cjs" (
    pkgs.writeText "postcss.config.cjs" ''
      module.exports = ${
        builtins.toJSON {
          plugins = {
            postcss-preset-mantine = { };
          };
        }
      };
    ''
  );
}
