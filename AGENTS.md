# Project knowledge index

This is **public** `quantile-co/quantile.co`. Read the complete
[MEMORY.md](.pi/memory/MEMORY.md) and affected source/tests before changes.
Never copy private infrastructure or DNS guidance here. Current source is
authoritative, not historical guides or generated prompt excerpts.

**README edits require explicit approval.** Preserve approved marketing copy.
Keep this root index; do not recreate nested `AGENTS.md` files.

The application has a newsletter homepage/archive, Markdown article pages,
a consulting letter, retained campaign pages (currently disabled), `/brand`
downloads and a minimal 404.
Newsletter content lives in `apps/web/content/newsletter/`; its server-only
loader is `apps/web/lib/newsletter.ts`. Subscription is not connected to a
provider. There is no Checkout, webhook, transactional email, welcome route or
application database. Preserve approved copy. Source cleanup does not establish
production retirement.

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
- [packages/brand/](packages/brand/): shared asset generator and CLI.
- [packages/testing/](packages/testing/): reusable browser-test support.
- [apps/web/next.config.ts](apps/web/next.config.ts): Next configuration and headers.
- [tf/](tf/): repository/state infrastructure, not application hosting.
- [.github/workflows/](.github/workflows/): checks, source releases and protected infrastructure.

Before changing Next.js code, read the relevant version-matched guide under
`apps/web/node_modules/next/dist/docs/`. The documented `agentRules: false`
setting prevents app-local generated guides; this root index remains canonical.
