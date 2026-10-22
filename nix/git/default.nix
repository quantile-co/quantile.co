{ pkgs, factory }:
{
  ignoreFile = pkgs.writeText ".gitignore" (
    builtins.readFile "${factory}/.gitignore"
    + ''

      # Application build output, local credentials and emulator state.
      /.quantile/
      /firebase-debug.log
      /firestore-debug.log
      /ui-debug.log
      /.pnpm-store/
      /.next/
      /out/
      /build/
      /storybook-static/
      /coverage/
      **/__screenshots__/
      /.vitest-attachments/
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
