# Project knowledge index

This is **public** `quantile-co/quantile.co`. Read the complete
[MEMORY.md](.pi/memory/MEMORY.md) and affected source/tests before changes.
Never copy private infrastructure or DNS guidance here. Current source is
authoritative, not historical guides or generated prompt excerpts.

**README edits require explicit approval.** Preserve approved marketing copy.
Keep this root index; do not recreate nested `AGENTS.md` files.

The application is a founder-letter landing page, `/brand` downloads, and a
minimal 404. It has no Checkout, webhook, transactional email, welcome route,
or application database. Keep the founder-letter wording unchanged until
separately reviewed. Source cleanup does not establish production retirement.

Public Check, manual immutable-source Build, protected-main Plan and exact Apply
are distinct workflows. A source merge or passing Check does **not** authorize
Build, Plan or Apply; require separate explicit review before each production
phase. Preserve WIF, state locks, provenance and release immutability. Do not
commit credentials, state, saved plans or customer payloads.

Update MEMORY.md only with branch-verified durable public project facts.
Do not store personal preferences, local machine/network details, credentials,
raw transcripts, routine validation diaries or automatic handoffs.
Review and sanitize memory changes before staging or sharing.

Human setup: [README.md](README.md). Development: `pnpm dev`.
Checks and tests: `pnpm test`. Build: `pnpm run build`.
Brand asset generation: `pnpm run build:assets`.

## Repository map

- [flake.nix](flake.nix) and [nix/](nix/): Factory tooling and managed-file sources.
- [.envrc](.envrc): pinned direnv shell and managed-file entry point.
- [package.json](package.json): workspace commands.
- [apps/web/](apps/web/): Next application, configuration, assets and tests.
- [apps/repo/](apps/repo/): repository checks and fixes.
- [apps/github/](apps/github/): immutable source publication and saved-plan transport.
- [apps/web/lib/brand/assets.ts](apps/web/lib/brand/assets.ts): brand asset generation.
- [apps/web/lib/http/headers.ts](apps/web/lib/http/headers.ts): security/cache headers.
- [tf/](tf/): repository/state infrastructure, not application hosting.
- [.github/workflows/](.github/workflows/): checks, source releases and protected infrastructure.

Before changing Next.js code, read the relevant version-matched guide under
`apps/web/node_modules/next/dist/docs/`. The documented `agentRules: false`
setting prevents app-local generated guides; this root index remains canonical.
