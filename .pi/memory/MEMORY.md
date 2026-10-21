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

## Application boundaries

- HTTP routes are explicit composition roots; use ordinary typed dependency
  injection, not service locators, dispatch frameworks or duplicate DTO layers.
- `lib/env/env.ts` owns staged environment parsing. Validate verification inputs
  first and other secrets only when needed. Module import and ignored/replayed
  events must not require unrelated sender credentials. Domain helpers receive
  explicit values rather than rereading ambient environment.
- Billing environment is independent of `NODE_ENV`. Keep development/production
  terminology internally and provider test/live terms at API boundaries. Reject
  live billing with an emulator. App identity remains stable across releases;
  test-operation/lifecycle identifiers are not extra configured instances.
- Preserve unchanged-byte signature checks, bounded bodies, invoice eligibility,
  complete pagination, safe errors and explicit ownership. Only Stripe initiates
  welcome operations; verified Resend callbacks reconcile existing requests.
- Welcome completion requires an immutable persisted request, provider acceptance
  and a durable receipt before completed HTTP 200. An ignored 200 is not delivery.
  Replays reuse the stored request and idempotency key. Preserve the first accepted
  ID, use receipt CAS/readback and never send email inside a database transaction.
  Timeouts can leave successful writes or sends; do not erase pending records.
- Recovery audits start from the eligible invoice population, not only failed
  webhooks. Distinguish accepted, pending, absent and conflicting records. Prefer
  callback reconciliation for known acceptance; a late retry beyond provider
  idempotency retention can duplicate email. Do not claim lifetime exactly-once
  delivery or infer nonacceptance from missing old logs.
- The official Firestore SDK belongs in the shared client factory; domain stores
  own persistence semantics. Emulator tests do not prove cloud IAM or routing.
  Integration cleanup must verify exact ownership, never broadly delete endpoints
  or terminate another owner's processes.

## Approved UI and copy decisions

Preserve approved marketing copy; README changes require explicit approval.
Capacity means concurrent in-progress issues, not monthly throughput, hours or
PR counts. Do not invent turnaround, support, refund, banked-time or legal policies,
or change the offer to conceal an unimplemented billing capability. Social proof
must reflect actual experience, not invented customers or endorsements.

Components remain standalone and receive behavior/siblings through props. Keep
shared layout tokens, light/dark themes, keyboard access, reduced motion and
semantic structure. Page and Storybook composition must agree. Layout changes
need responsive inspection, not merely a passing build.

The hosted Portal link is footer-only, labeled “Billing” after FAQ, not a header
or magic-link URL. Checkout lets Stripe select eligible enabled payment methods;
exact HTTPS-origin checks permit only approved hosts. FAQ examples prioritize
GCP, AWS, Snowflake and Databricks; Azure needs a new copy decision. Approved hero
animation titles are retained in the [copy decisions](daily/2026-10-12.md), not as
an implementation-status record. Current source holds the authoritative copy.

## Factory and release tooling

Consumers explicitly select pinned tools and native files. Use small `nix/`
modules, not a consumer `etc/` directory or release-shell tool bundle. Devenv
follows `this/*` and imports the native
workflow module through `inputs.this.nixModules.default`. The committed flake lock pins
Factory; Terraform module refs may lag a compatible revision. Keep both Nix locks
in sync. Checks are
read-only; fixes and Git-hook installation are explicit. Do not weaken assertions
or omit test projects to conceal a dependency mismatch.

`nix/biome.nix` extends native policy; its generated root file is copied because
the pinned Biome version cannot safely use that config symlink. Playwright's
browser must match the npm client version. Vitest browser projects need separate
provider instances. Keep README setup concise rather than duplicating inventories.

`nix/secretspec.nix` extends Factory's native manifest. Credential resolution is
runtime-only; default/Check remain provider-credential-free. Profiles do not
isolate ambient credentials, load Next dotenv files or authorize provider actions.
Application semantics and child-credential scoping remain in the app's env/launcher
code. Ordinary tests use an isolated demo emulator. Provider-backed integration
is a separate, explicitly authorized entry point, not part of ordinary tests.

Check, Test, Build, Plan and Apply are distinct operations. Build loads trusted
pinned tooling and verifies exact-source Check, selected attempt/job, main ancestry
and version before publishing immutable source/Rules assets. Package inputs come
from reviewed Git objects. API errors are not absence; existing tags/drafts stop
publication rather than trigger automatic recovery. Preserve asset/provenance
verification, actor guards, serialization, signatures and bounded execution.

`tf/infrastructure/` owns repository/state infrastructure through Factory modules,
not a reusable Stripe catalog or application topology. Keep the existing bucket,
`repository/prod`, lineage and immutable-release guard. Native Plan stores private GCS saved bytes and optional private diagnostics;
Apply downloads the operator-selected `plan_ref` generation and applies those
exact bytes without replanning. No GitHub artifact or receipt is produced.
Maintain WIF, locks, protected environments and plans-only human reads. Keep main
fixed during review. New production operations require new authorization.

## Completed public rollouts

- Factory migration: immutable `v0.2.16`, Build `39475543087`; Plan `39476218139`,
  receipt `12288689117`, approved Apply `39477215702`. Ten address moves preserved
  resources, with no replacements/deletions. Storage audit logging and plans-only
  review access were established. Temporary handoff, moves, provider alias and
  legacy gate were removed. Ordinary Plan `39479160577` confirmed convergence.
- Configuration/release-tool refactor: source `42561c3`, immutable `v0.2.17`, Build
  `39493415503`; no-change Plan `39494880931`, receipt `12297920416`, approved Apply
  `39496148733`. Review is closed; no saved-plan approval carries forward.

These were source/repository-infrastructure rollouts, not site deployments or
provider-backed application tests. They do not establish present Checkout,
Billing TLS, webhook, inbox-delivery or refund behavior. The historical missing
Link-option report was resolved; do not reopen it from stale notes.
