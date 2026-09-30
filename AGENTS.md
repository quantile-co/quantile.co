# Agent guide

## Navigation

Read applicable scoped `AGENTS.md` files before changing a source area. These are
agent-maintained implementation notes; read linked references only as needed.

- Marketing UI, approved-copy decisions and responsive checks (also for page/story
  composition): [components/AGENTS.md](components/AGENTS.md).
- Local development, test commands and CLI lifecycle: [lib/dev/AGENTS.md](lib/dev/AGENTS.md).
- Webhook transport, runtime configuration and composition: [app/api/AGENTS.md](app/api/AGENTS.md).
- Shared Google Cloud client: [lib/gcp/AGENTS.md](lib/gcp/AGENTS.md).
- Welcome delivery, persistence and completeness audit:
  [lib/welcome/AGENTS.md](lib/welcome/AGENTS.md).
- Setup and routine commands: [README.md](README.md). Full local gate: `pnpm check`.

## Boundaries

- This repository owns application code, portable Firebase configuration/rules
  and the reusable Stripe catalog module. Deployment topology and secret
  provisioning belong to the private infrastructure repository.
- Accept arbitrary valid app instances and explicit Stripe test/live mode. Do
  not embed private project IDs, PR policies or credentials in application code.
- The target server runtime is Firebase App Hosting/Firestore with normal Next.js startup,
  not development forwarding tools, a custom production launcher or Dockerfile.
- Keep only `pnpm test` and `pnpm test:integration` as test entrypoints. The latter
  uses real providers and requires explicit test configuration. Do not silently
  skip unavailable integration coverage or describe emulator tests as live proof.
- Preserve approved marketing copy. Capacity means concurrent in-progress
  issues, not monthly throughput; do not invent turnaround or billing promises.

## Responsibility map

- `app/`: Next.js routes and page composition; `app/globals.css` owns shared styles.
- `components/`: standalone PascalCase React component directories.
- `stories/`: Storybook compositions and browser interaction coverage.
- `app/api/`: two provider routes own signature verification, eligibility, HTTP
  responses and concrete dependency wiring. No event-dispatch hierarchy for now.
- `lib/app/instance.ts`: plain app-identity value validation, not environment reading.
- `lib/dev/`: `run.ts` is the development composition root; process, emulator,
  remote integration and ownership behavior live in cohesive sibling modules.
  `scripts/dev.ts` delegates. Ordinary dev includes the emulator; `--integration`
  adds remote providers. Java 21+ is required for both dev and tests.
- `lib/welcome/`: shared delivery, receipt, persistence, Resend sending and rendering.
  Keep `resend.ts` separate; inline single-use test fixtures where practical.
- `lib/brand/`: `assets.ts` owns asset generation/validation and colocated tests;
  `scripts/assets.ts` only delegates to `runAssets`. Regenerate assets with
  `pnpm assets:generate`, not hand edits to generated output.
- `lib/stripe/test.ts`: shared provider-test operation/target support.
- `tf/`: this repository's settings/state infrastructure; `tf/quantile-co/` is
  the reusable Stripe catalog module, not production application topology.

## Code conventions

- `scripts/` contains thin entrypoints. Put behavior and colocated tests in `lib/`.
  Development orchestration stays in `lib/dev/`, not a production entrypoint.
  Avoid same-level files/directories with identical names; the entrypoint is `run.ts`.
- TypeScript source and entrypoints use `.ts` (`.tsx` for JSX); the package is ESM.
  Direct Node execution uses type stripping and explicit relative `.ts` imports.
  Keep `.cjs` only for configuration deliberately using CommonJS.
- Colocate `<module>.test.ts` (or `.test.tsx`) and single-file test support `test.ts`;
  test that support in `test.test.ts`. Create a `test/` directory only for several
  responsibility-specific helpers; do not put tests under `scripts/`.
- Collections/categories are plural (`components/`, `stories/`); individual
  responsibilities are singular (`welcome/`, `delivery.ts`). Multiple
  functions do not automatically make a module's name plural.
- Ordinary paths are kebab-case; React component paths are PascalCase. Preserve
  framework/provider names such as `route.ts` and `invoice.payment_succeeded`.
- Avoid redundant path context: `store.ts` inside `lib/welcome/`, not
  `welcome-store.ts`. Do not restore a dispatcher hierarchy for one event.
- **App instance** is the only configured application identity. Integration is
  one concept for manual and automated provider use; forwarding is its mechanism.
  Lifecycle ownership tokens and per-test operation IDs remain internal, not extra
  configurable instances. See the scoped development guide.
- Use ordinary dependency injection: roots read inputs and construct dependencies;
  other modules receive typed values/clients/functions. Simple shared data types,
  Zod schemas and pure helpers can be imported directly. No DI container, layered
  ports/adapters hierarchy or duplicate boundary DTOs. Extract files for meaningful
  responsibilities, not every function. `@next/env` loads launcher files, Zod validates
  values, Commander parses CLI arguments. There is no central `config.ts`/`env.ts`.
  OS/tool environment settings inherit normally; narrowly scope known credentials.
- Biome rules follow roles, never a list of named domains: no environment reads
  outside entrypoints/configuration/tests, no import cycles, and no library imports
  of route/script/run entrypoints. Shared data types/schemas remain ordinary imports.
- Use `STRIPE_PRICE_ID` / catalog output `price_id` for the one selected price and
  `GCP_PROJECT_ID` for all application Google resources. Rename interfaces without
  renaming/recreating existing Terraform resources. Test/live catalogs stay separate.

## Knowledge maintenance

Keep this repository's guidance self-contained. Parent-workspace Markdown,
including generic TypeScript guidance and research/review notes, is optional and
may move or disappear. Record relevant confirmed decisions here or in scoped
`AGENTS.md`; do not require external workspace files or import old proposals as
current requirements.

Keep the root human README succinct: roles, prerequisites, setup and commands,
not implementation status, migration history or feature internals. Human docs,
when needed, belong in a source area's `README.md` or local `docs/` directory.
Reserve root `docs/` for a future documentation site that selects human content;
exclude agent notes by default. Do not create empty documentation placeholders.

Update scoped agent notes with non-obvious invariants, decisions, failure modes
and verification gaps when changing their implementation. Replace stale facts;
do not append transcripts or duplicate code descriptions. Keep source/tests as
the evidence and never put secrets, payloads or personal data in notes.
