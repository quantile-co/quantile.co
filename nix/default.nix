{
  pkgs,
  factory,
}:
{
  biome = import ./biome { inherit pkgs factory; };
  dependabot = import ./dependabot { inherit pkgs factory; };
  editorconfig = import ./editorconfig { inherit pkgs factory; };
  git = import ./git { inherit pkgs factory; };
  github = import ./github { inherit pkgs factory; };
  knip = import ./knip { inherit pkgs factory; };
  next = import ./next { inherit pkgs factory; };
  postcss = import ./postcss { inherit pkgs factory; };
  typescript = import ./typescript { inherit factory; };
  vale = import ./vale { inherit pkgs factory; };
  vitest = import ./vitest { inherit pkgs factory; };
}
