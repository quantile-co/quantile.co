{
  config,
  lib,
  pkgs,
  ...
}:
{
  imports = [ ./github ];

  options.quantile = {
    biomeFile = lib.mkOption {
      type = lib.types.package;
      default = import ./biome.nix { inherit config lib pkgs; };
      description = "Public site Biome configuration.";
    };
    secretspecFile = lib.mkOption {
      type = lib.types.package;
      default = import ./secretspec.nix { inherit config pkgs; };
      description = "Public site SecretSpec manifest.";
    };
    firebaseFile = lib.mkOption {
      type = lib.types.package;
      default = config.quantile.firebase.withOverrides (import ./firebase.nix);
      description = "Public site Firebase configuration.";
    };
  };
}
