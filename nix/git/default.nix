{ pkgs, factory }:
{
  ignoreFile = pkgs.writeText ".gitignore" (
    builtins.readFile factory.git.ignoreFile
    + ''

      # Legacy memory is preserved read-only; keep local recovery and indexes private.
      /.pi/memory/SCRATCHPAD.md
      /.pi/memory/recovery/
      /.qmd/index.sqlite*
      /.qmd/.qmd-embed.lock

      # Application build output, local credentials and development artifacts.
      .quantile/
      .pnpm-store/
      .next/
      out/
      build/
      coverage/
      **/__screenshots__/
      .vitest-attachments/
      .DS_Store
      *.pem
      *-debug.log*
      .env*
      !.envrc
      *.tsbuildinfo
      next-env.d.ts
    ''
  );
}
