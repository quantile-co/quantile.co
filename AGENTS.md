# Project knowledge index

This is **public** `quantile-co/quantile.co`. Verified checkout-specific
knowledge lives in [MEMORY.md](.pi/memory/MEMORY.md), with the full former
public guides preserved as explicitly historical entries in the plugin-native
[daily log](.pi/memory/daily/2026-10-07.md). Never copy private Q1/DNS guidance
here. Pi-memory injects only an excerpt; read the complete MEMORY.md and the
affected source/tests before changes. Historical descriptions, especially of
the old reusable Stripe catalog, are not current source or live-state proof.

**README edits require explicit approval.** Preserve approved marketing copy.
Keep this root index; do not recreate nested `AGENTS.md` files. Source and tests
are authoritative, not historical guides or generated prompt excerpts.

This checkout contains Next.js Checkout, signed Stripe/Resend webhook routes,
Firestore-backed welcome logic and repo-owned Firebase configuration. Production
provider credentials, test/live catalog identity and deployment topology have
separate owners. No mocked or emulator Check proves real Checkout, webhook or
email delivery. Do not put a Stripe test checkout or secrets on the live site.

Public Check, manual immutable-source Build, protected-main Plan and exact Apply
are distinct workflows. A source merge or passing Check does **not** authorize
Build, Plan, Apply or provider-backed testing; require separate explicit review
before each production phase. Keep WIF, state locks, provenance, and release
immutability. Do not commit credentials, state, saved plans, customer payloads
or live Checkout URLs.

Update MEMORY.md only with branch-verified durable facts. The dated daily log
contains full obsolete research and old nested-file instructions for history,
not an active runbook. Review memory changes before Git publication; ignore
unreviewed generated session logs, scratchpad and recovery data.

Human setup: [README.md](README.md). Full local validation: `pnpm check`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
