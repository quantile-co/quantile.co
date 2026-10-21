{
  description = "Quantile public application development tools";

  inputs = {
    factory.url = "github:quantile-co/factory/a6ce017d2c3a36a6da24d132d4e6cf1641db3699";
    nixpkgs.follows = "factory/nixpkgs";
    devenv.follows = "factory/devenv";
    devenv-cli.follows = "factory/devenv-cli";
    git-hooks.follows = "factory/git-hooks";
    go-overlay.follows = "factory/go-overlay";
    llm-agents.follows = "factory/llm-agents";
    mk-shell-bin.follows = "factory/mk-shell-bin";
    nix2container.follows = "factory/nix2container";
  };

  outputs = { factory, ... }: {
    nixModules.default = ./nix;

    packages = builtins.mapAttrs (_: packages: {
      inherit (packages) devenv-cli;
    }) factory.packages;
  };
}
