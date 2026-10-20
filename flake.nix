{
  description = "Quantile public application development tools";

  inputs = {
    factory.url = "github:quantile-co/factory/385fda43eadfe7cd6b7fea9b2faab3463011f98f";
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
    packages = builtins.mapAttrs (_: packages: {
      inherit (packages) devenv-cli;
    }) factory.packages;
  };
}
