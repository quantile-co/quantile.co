{
  description = "Quantile public application development tools";

  inputs = {
    factory.url = "github:quantile-co/factory/43e493b1be2ae40437b5d3cda4c8b74d4a38027c";
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
