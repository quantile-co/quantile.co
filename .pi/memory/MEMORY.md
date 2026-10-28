# Public application memory

Current source, tests and deployment skills take precedence. Keep public guidance
self-contained; never copy private infrastructure procedures or deployment history
here. Source releases are not site deployments.

## Memory policy

Keep durable repository decisions, unresolved issues and deployment outcomes.
Exclude machine-specific information, temporary paths, session handoffs, routine
check counts and investigation transcripts. Never retain credentials, customer
payloads, state, saved plans or live Checkout URLs. Commit sanitized notes with
related changes without recurring note-only validation cycles.

## Application and UI

This branch contains only the founder-letter landing page, brand downloads and
a minimal 404, with optional Fathom analytics. Checkout, webhooks, welcome email,
database access, provider integration tooling and Storybook are removed.
This source state is not evidence of a deployed rollout or external-resource
retirement. The letter is still placeholder copy pending separate review.

Preserve the current responsive design, light/dark themes, keyboard access,
reduced-motion behavior and semantic structure. Components receive siblings
through props; avoid service locators and unnecessary abstractions. Keep focused
tests for current behavior rather than retaining coverage for deleted features.

The landing page uses an external booking link and a mailto link; no embedded
calendar or local form is needed. The top social proof switches to a carousel
below 768px. With reduced motion enabled, it intentionally stays static
(initially showing AJ), without manual navigation. The standalone founder card
aligns optically with the CTA/email
block on larger viewports. Homepage and brand markup/styles live alongside their
routes, not in single-use section components. The shared fixed bottom-right
`ThemeSwitcher` reveals on scroll, pointer interaction, hover or keyboard focus
on all pages and hides after inactivity.

Keep `/brand`, its downloads, sitemap entry and generated assets. Brand and 404
have no header or booking CTA; the 404 retains its central home button. Neither
page includes legacy marketing navigation, Checkout, billing or old funnel
content. README edits require explicit approval.

## Factory and workspace tooling

JS/TS workspace names include organization and repository:
`@quantile-co/quantile.co-<name>`, adding `-cli` for CLI apps.
This applies to `packages/` as well as `apps/`. The root remains
`@quantile-co/quantile.co`.

The application lives in `apps/web/`, including Next, site-native configuration,
tests and brand assets. Its build is `next build`; root commands
orchestrate pnpm/Turbo workspaces. Keep app semantics and approved copy unchanged.
`packages/brand` owns the shared generator and `quantile-brand-assets` CLI.
Apps consume it as a workspace dependency. The CLI writes/checks the calling
app directory; library functions accept an explicit output directory.
`packages/testing` exports the Next Image browser-test stub; it is not production
UI. Both packages stay flat. The web app has no generic `lib/` directory.
The root AGENTS index remains canonical. Next's documented `agentRules: false`
prevents `next dev` from creating a nested guide after relocation; agents still
read version-matched documentation from the web workspace's installed Next package.

`apps/repo/` owns repository checks/fixes. Development runs native `next dev`;
ordinary tests run Vitest unit/browser projects directly, with no emulator,
provider credentials or tunnel. Direct TypeScript scripts and the asset CLI run
through `tsx`.

Factory is composed through explicit `lib.evalModules`, package/file selections,
and Files then Pi shell hooks. `.envrc` sources optional ignored `.envrc.local`
before entering the pinned shell.
Meaningful `nix/<tool>/default.nix` renderers own site configuration; Factory
provides native defaults and formatting. Managed files are tracked regular copies;
Check compares both worktree and index. Manifests and locks remain seed/tool-owned.
Install dependencies explicitly, then run checks. Neither shell entry nor checks
install dependencies or synchronize skills. Turbo caches reproducible build outputs
locally by default; checks, fixes and tests always execute.

Local caching remains the default. CI persists .turbo/cache on the existing
Restricted Namespace volume and may use remote team main in this repository's
workspace. The native TURBO_TOKEN secret is a server-scoped reader at
organization/repository scope, overridden by a cache-only writer in the existing
prod environment for trusted main Test/Build. Test, Build, Plan and Apply use prod
where they exist; no separate cache environment is used. External/fork PRs receive
no remote token; developers use reader-scoped credentials. Checks/tests/fixes and
Plan/Apply remain uncached. CI readers and expiring, cache-only prod writers are
installed; rotate the current 90-day credentials before 2027-01-23.
On 2026-10-25, population run 40190338612 and verification run 40191374711
qualified all four cache layers on quantile-4x8: Turbo local-only and remote-only
hits, changed-input misses, Nix store reuse with builds/substitutions disabled,
and signed remote imports from the intended Cachix cache into an empty isolated store.
Volume snapshots initially missed or were stale; later independent runners reused
both caches. This is best-effort fleet-local reuse, not guaranteed freshness.
Repository/profile isolation, Restricted access and main-only publication were
unchanged. Other profiles are not implicitly warm. Temporary diagnostics were
removed. The rejected separate-environment plans are obsolete and must not be applied.

Exact published `@quantile-co/factory-github@0.1.0` and
`@quantile-co/factory-pi@0.1.0` replace copied runtime code. Pi loads the prebuilt
extension through native settings. `pnpm run skills:sync` explicitly installs
the selected deploy and web-quality catalog into ignored native skill locations;
the committed skills lock records provenance. Do not recreate shared extensions,
copied skills or a consumer `etc/` tree.

## Source release and infrastructure boundaries

`apps/github/` owns workflow entry points and immutable source publication.
Check, Test, Build, Plan and Apply remain distinct operations. Build uses trusted
pinned tooling, separately checks out candidate source, verifies exact-source Check,
selected attempt/All job, main ancestry and the committed `apps/web/package.json`
version/build script. Never execute candidate code with the publishing token.
API errors are not absence; existing tags/drafts stop publication. Retry visibility
reads only, never publication writes. Verify exact commit/tag and release immutability.

Each new publication needs an unused immutable version matching
`apps/web/package.json`; never republish an existing tag.

GitHub's automatic source archive is the sole handoff: no custom ZIP, Rules asset
or release manifest. Commit the complete root pnpm workspace/lock/Turbo configuration
and app-native files so source builds require no Nix materialization. Firebase App
Hosting supports the Turborepo workspace with archive `rootDirectory: apps/web`;
the web build remains `next build`, not a custom Docker/image build. Keep private
runtime configuration out of public source. `apps/web/next.config.ts` owns
security/cache headers through its `nix/next/default.nix` source. Source releases no longer require Firebase Hosting
configuration or Firestore Rules files; deployment consumers must use the matching
landing-page-only archive contract.

The single `tf/` root owns repository/state infrastructure, not application
deployment or a reusable Stripe catalog. Keep the existing bucket, resource
addresses, lineage and immutable-release guard. Its active backend is
`quantile.co/prod/infrastructure`; the old `repository/prod` live state was retired.
Do not recreate the old backend or add a runtime fallback. Future resource
operations require fresh Plan review and separate exact Apply authorization.

Owner/member identity pairs live in Terraform source. Workflow actor-roster
variables are no longer inputs; retain protected main/prod, required All, Namespace
runners, WIF/IAM and production/source-release serialization. Q0-supplied WIF remains
a standing workflow setting. Only provider subprocesses receive repository
credentials and native provider mappings; storage transport receives a separate
allowlisted environment.

Plan/Apply run locked `tsx` directly, outside Turbo and without a tooling-build
prerequisite. Frozen installation immediately precedes each workflow task.
Plan stores saved bytes and private diagnostics in GCS. Apply consumes the exact
operator-selected `GH_PLAN_REF` generation without replanning. No GitHub plan
artifact or receipt is produced. Build/publication, Plan, Apply,
state migration and credential changes each require separate authorization.

## Completed public rollouts

- Workspace/backend cutover: state-only Apply `40171942856` from source
  `20190f991c8517f294cd6b6a76dc0ff00bab9918` moved `repository/prod` to
  `quantile.co/prod/infrastructure` in the existing bucket. Native migration
  preserved lineage and operational resource/provider/output content with exactly
  one serial increment; only transient top-level validation-check metadata was
  allowed to normalize. Create-only byte-verified raw backups were held outside
  plan-reader access until approved post-lifecycle retirement. Exact-generation
  CAS retired the old live object. Maintenance Apply `40177161874` subsequently
  deleted 19 obsolete object generations: seven recovery copies/logs, nine old
  backend versions and three noncurrent active-backend versions. Current state,
  saved plans and bucket safeguards were excluded. Temporary migration and
  maintenance code, tests and workflow overrides are removed. The original
  state-only cutover did not itself authorize resource operations or rollout.

- Factory migration: immutable `v0.2.16`, Build `39475543087`; Plan `39476218139`,
  receipt `12288689117`, approved Apply `39477215702`. Ten address moves preserved
  resources, with no replacements/deletions. Storage audit logging and plans-only
  review access were established. Temporary handoff, moves, provider alias and
  legacy gate were removed. Ordinary Plan `39479160577` confirmed convergence.
- Configuration/release-tool refactor: source `42561c3`, immutable `v0.2.17`, Build
  `39493415503`; no-change Plan `39494880931`, receipt `12297920416`, approved Apply
  `39496148733`. Review is closed; no saved-plan approval carries forward.
- Paired configuration contract: source `2acdf432549a7127185babb6fd882c3324ee8942`,
  immutable `v0.2.20`, Build `39920543291`; repository-infrastructure Apply
  `39923368115` succeeded. The temporary module-address move is retired. This
  release and Infrastructure Apply do not establish a site deployment or authorize
  another production phase.

These were source/repository-infrastructure rollouts, not site deployments or
external-resource retirement. They do not authorize another production phase.
