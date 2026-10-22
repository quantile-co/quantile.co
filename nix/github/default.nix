{ pkgs, factory }:
{
  workflows = import ./workflows { inherit pkgs factory; };
}
