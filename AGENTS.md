# Project knowledge index

This is **public** `quantile-co/quantile.co`. Verified checkout-specific
knowledge lives in [MEMORY.md](.pi/memory/MEMORY.md). Never copy private Q1/DNS
guidance here. Pi-memory injects only an excerpt; read the complete MEMORY.md and the
affected source/tests before changes. Historical descriptions, especially of
the old reusable Stripe catalog, are not current source or live-state proof.

**README edits require explicit approval.** Preserve approved marketing copy.
Keep this root index; do not recreate nested `AGENTS.md` files. Source and tests
are authoritative, not historical guides or generated prompt excerpts.

This checkout contains Next.js Checkout, signed Stripe/Resend webhook routes,
Firestore-backed welcome logic and repo-owned Firebase configuration. Production
provider credentials, test/live catalog identity and deployment topology have
separate owners. No mocked or emulator Check proves real Checkout, webhook or
email delivery. Do not put a development Checkout or secrets on the production site.

Public Check, manual immutable-source Build, protected-main Plan and exact Apply
are distinct workflows. A source merge or passing Check does **not** authorize
Build, Plan, Apply or provider-backed testing; require separate explicit review
before each production phase. Keep WIF, state locks, provenance, and release
immutability. Do not commit credentials, state, saved plans, customer payloads
or production Checkout URLs.

Update MEMORY.md only with branch-verified durable public project facts. Never
store personal preferences, local machine/network details, credentials, or raw
session transcripts in this repository's memory. Use memory outside this public
checkout for unrelated topics. Do not retain obsolete guides, automatic session
handoffs or routine validation diaries in memory. Review and sanitize each
memory change before staging or sharing;
keep scratchpad and recovery data local and ignored.

Use **development** and **production** for application billing environments,
independently of Next.js build mode. Keep provider terms (`livemode`, `test`/`live`
key prefixes) at API boundaries, and keep automated tests and `NODE_ENV=test`
named as tests. A production build can use development billing.

Human setup: [README.md](README.md). Checks and the full ordinary test suite:
`pnpm test`. Builds: `pnpm run build` and `pnpm run build:storybook`.
Provider-backed tests remain separately authorized.

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

- [flake.nix](flake.nix): Factory input, development tools and copied-file selections.
- [nix/](nix/): tool-owned configuration rendering and Factory overrides.
- [nix/github/workflows/](nix/github/workflows/): workflow template customizations.
- [.envrc](.envrc): pinned direnv shell and managed-file entry point.
- [package.json](package.json): install/dev/check/fix/test/build entry points.
- [apps/web/](apps/web/): Next application, Storybook, site configuration and tests.
- [apps/repo/](apps/repo/): repository checks and site dev/assets command dispatch.
- [apps/github/](apps/github/): immutable source publication and saved-plan transport.
- [apps/web/lib/brand/assets.ts](apps/web/lib/brand/assets.ts): brand asset generation and checks.
- Next guides: `apps/web/node_modules/next/dist/docs/`.
- [tf/](tf/): single repository/state deployment root.
- [.github/workflows/](.github/workflows/): CI, source releases and protected deployment.

Before changing Next.js code, read the relevant version-matched guide under
`apps/web/node_modules/next/dist/docs/`; training knowledge may be outdated.
The documented `agentRules: false` setting prevents app-local generated guides;
this root index remains canonical.
