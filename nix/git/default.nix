{ pkgs, factory }:
{
  ignoreFile = pkgs.writeText ".gitignore" (
    builtins.readFile factory.git.ignoreFile
    + ''

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
