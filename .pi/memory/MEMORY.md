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

This branch contains a consulting letter at `/`, `/brand` downloads and a minimal
404, with optional Fathom analytics. Newsletter, archive, Markdown article,
subscription and campaign UI/routes are removed. `/consulting`, `/newsletter`
and `/lp/*` now return 404 rather than redirects. Checkout, webhooks, welcome
email, database access, provider integration tooling and Storybook remain absent.
This source state is not evidence of a deployed rollout or external-resource
retirement. Preserve the approved letter copy: software and data engineering
experience, small data teams at companies under 500 people, DSPy and GEPA across
AI and data platforms, AI/Data service lists, and an email/booking invitation.
The approved offer is “Retainers start at $15k for 80 hours a month.” Do not infer
additional availability, rollover, support, refund or billing policies.

Preserve responsive design, light/dark themes, keyboard access, reduced-motion
behavior and semantic structure. Components receive behavior and siblings through
props; avoid service locators and unnecessary abstractions. Keep focused tests
for current behavior rather than retaining coverage for deleted features.

The homepage lives directly in `app/page.tsx` and has no header or full site
footer. Its bottom controls are a centered stack of copyright then theme switcher,
with auto top margin to stay at the bottom on tall viewports and no wordmark or
divider.
The top-level layout owns providers, analytics and the skip link. Shared
`app/(root)/layout.tsx` composes the header and footer only for brand and is also
used explicitly by 404, without a separate chrome wrapper file. The header pairs the home wordmark
with the shared arrow-free “Book a call” CTA injected through props. Its 32px CTA
is vertically centered within the 35px wordmark box. The footer retains its theme
control; the homepage uses its own compact theme control and the same saved or
system theme.

The consulting homepage uses `components/LandingPage` without video, sidebar,
newsletter form or P.S. A single portrait sits above “Hi, I’m AJ.” without a
name/email caption, sharing the letter's left edge. Its size is twice the
responsive title font size (64–96px). Portrait-to-title and title-to-opening gaps
are both 20px. The portrait row preserves title leading and aligns the image to
its cap height. The 800px container retains 752px of desktop reading width,
with 64px of outer top spacing. Body text is 18px below 768px and 20px from
768px, with 1.55 line-height and normal tracking. Bullets remain 18px, grouped into semantic sections with “AI” and “Data” H2
headings, forming two columns from 576px and stacking below it; never use a table. The shared portrait lives at
`public/images/contributors/aj-welch.webp`.

The letter uses an external booking link and a mailto link, not an embedded
calendar or local form. Signature and booking CTA share a row. Social proof shows
Google, CompilerWorks and Chartio in three static columns down to 320px. Company
names stay beside their square marks. Full, unwrapped bylines and “Clients:”
share a left-aligned line below, with periods rather than middle-dot separators.
A shared 3px gap separates company header, byline
and client logos. CompilerWorks has a wider column. Smaller client logos use
evenly spaced slots with left-aligned names underneath. Banner text, logos and
borders inherit the letter color through `currentColor`.

`lib/metadata.ts` supplies consulting-focused shared metadata; routes retain
their own canonical URLs. The homepage emits Organization and WebSite JSON-LD.
The sitemap lists only `/` and `/brand`, without synthetic update dates.

Keep `/brand`, its downloads, sitemap entry and generated assets. Its source and
generated social images live under `app/(root)/brand`; `packages/brand/assets.ts`
owns those output paths. The 404 retains its central home button. Header, footer
and widest page content use Mantine `xl` containers with matching horizontal
padding; the letter remains narrower. README edits require explicit approval.

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
UI. Both packages stay flat. The web app's `lib/` holds shared page metadata.
The root AGENTS index remains canonical. Next's documented `agentRules: false`
prevents `next dev` from creating a nested guide after relocation; agents still
read version-matched documentation from the web workspace's installed Next package.

`apps/repo/` owns repository checks/fixes. Development runs native `next dev`;
ordinary tests run Vitest unit/browser projects directly, with no emulator,
provider credentials or tunnel. Direct TypeScript scripts and the asset CLI run
through `tsx`; repository and release CLIs have no bundle-build step. Blog-specific
skills and article/form/pagination configuration are removed; copy-editing remains
available for the consulting letter.

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
workspace. Use one expiring, cache-only read/write TURBO_TOKEN organization
secret with GitHub visibility `all`, covering every current and future repository
in this organization, without repository or environment shadowing copies.
As with Cachix, authorized repository workflow writers are trusted across the
shared remote cache. Main-only publication is workflow policy,
not a secret-release boundary. Check uses remote:r; trusted main Test/Build may
use remote:rw. External/fork PRs receive no remote token; developers use user-bound,
server-scoped readers. Keep prod/provider protections and platform-enforced
main-only volume snapshot publication unchanged. Checks/tests/fixes and Plan/Apply
remain uncached. Credential changes require separate approval and live verification.
The current organization CI writer expires on 2027-02-03. The original 2026-10-25
qualification used CI readers and cache-only prod writers with a 2027-01-23 expiry;
those prod overrides are no longer used by CI.
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
