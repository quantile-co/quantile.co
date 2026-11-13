# Project knowledge index

This is **public** `quantile-co/quantile.co`. Read affected source/tests before
changes. Native Hindsight uses bank `quantile-co--quantile-co`, configured in
[.pi/hindsight.json](.pi/hindsight.json) through the pinned development shell.
Use the `hindsight` skill selected by `pnpm run skills:sync`.
Never copy private infrastructure or DNS guidance here. Current source is
authoritative, not recalled memory or historical guides.

**README edits require explicit approval.** Preserve approved marketing copy.
Keep this root index; do not recreate nested `AGENTS.md` files.

The application has a consulting letter at `/`, `/brand` downloads and a minimal
404. The homepage has no header and only centered, stacked copyright/theme
controls at the bottom. Brand and 404 share a header pairing
the home wordmark with an arrow-free “Book a call” CTA, plus the theme footer. Newsletter, article, subscription and campaign UI/routes are removed.
There is no Checkout, webhook, transactional email, welcome route or application
database. Preserve approved copy. Source cleanup does not establish production
retirement.

Public Check, manual immutable-source Build, protected-main Plan and exact Apply
are distinct workflows. A source merge or passing Check does **not** authorize
Build, Plan or Apply; require separate explicit review before each production
phase. Preserve WIF, state locks, provenance and release immutability. Do not
commit credentials, state, saved plans or customer payloads.

Do not write Markdown memory files or memory commits. Legacy `.pi/memory/`
and its memory-only QMD collection are retired; do not recreate them. Runtime activation
requires separate approval and a fresh session, not resuming legacy transcripts.
Never retain credentials, state, saved plans or customer payloads.

Human setup: [README.md](README.md). Development: `pnpm dev`.
Checks and tests: `pnpm test`. Build: `pnpm run build`.
Brand asset generation: `pnpm run build:assets`.

## Writing audit MCP servers

[.pi/mcp.json](.pi/mcp.json) shares the official hosted Pangram and Copyleaks
servers with every checkout. Use Pi's built-in MCP support; no extra extension,
skill, API key or server installation is needed. Start Pi from the repository
root in the pinned development shell and approve project trust when prompted.
Each developer then signs in with their own accounts on the machine running Pi:

```sh
pi mcp login pangram
pi mcp login copyleaks_app
pi mcp list
```

OAuth credentials stay outside the repository in `~/.pi/agent/mcp-auth.json`
(or the configured Pi agent directory). Do not commit or share them. In an
existing session, run `/reload`, then `/mcp` to inspect connections or sign in.
Herdr sessions use the same project configuration when launched from this checkout.
A personal MCP adapter that replaces `/mcp` must be disabled to use native support.

[Pangram](https://www.pangram.com/solutions/mcp) uses developer API credits, not
dashboard scans. [Copyleaks](https://docs.copyleaks.com/mcp/overview) requires an
active paid balance. Configuration does not authenticate accounts or run scans.
Only submit explicitly requested content for audits: scans send text to external
services and may consume credits. Never upload secrets or customer payloads.
Do not add scans to shell hooks, checks or CI.

## Repository map

- [flake.nix](flake.nix) and [nix/](nix/): Factory tooling and managed-file sources.
- [.envrc](.envrc): pinned direnv shell and managed-file entry point.
- [package.json](package.json): workspace commands.
- [apps/web/](apps/web/): Next application, configuration, assets and tests.
- [apps/repo/](apps/repo/): repository checks and fixes.
- [apps/github/](apps/github/): immutable source publication and saved-plan transport.
- [apps/amp/](apps/amp/) and [.agents/](.agents/): explicit manual-orb CLI and lifecycle hooks.
- [packages/brand/](packages/brand/): shared asset generator and CLI.
- [packages/testing/](packages/testing/): reusable browser-test support.
- [apps/web/next.config.ts](apps/web/next.config.ts): Next configuration and headers.
- [tf/](tf/): repository/state infrastructure, not application hosting.
- [.github/workflows/](.github/workflows/): checks, source releases and protected infrastructure.

Before changing Next.js code, read the relevant version-matched guide under
`apps/web/node_modules/next/dist/docs/`. The documented `agentRules: false`
setting prevents app-local generated guides; this root index remains canonical.
