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

The committed flake lock pins Factory. `flake.nix` owns development tools and
native root files through `lib.mkFlake`, without a local `nix/` directory.
Extend Factory templates where available; define site-only configurations there
and copy them from the store too. Root configurations are tracked regular files;
`.envrc` runs `factory-files write` and Check compares worktree and Git-index
copies. Keep template sources out of runtime paths; Vale uses `.vale/styles/`.
Leave tool-mutated files such as `package.json`, dependency locks and pnpm build
approvals tool-owned, not copied. Checks are read-only; fixes and Husky installation
are explicit. Never omit test projects or weaken assertions to conceal a mismatch.

Pnpm tasks live under `scripts/pnpm/`; dev/assets entry points are thin TypeScript
wrappers around `lib/dev/` and `lib/brand/assets.ts`. Every checked-in workflow
has an entry point under `scripts/github/`. Playwright's pinned Nix browser must
match the npm client version, with separate Vitest browser provider instances.
Keep README setup concise rather than duplicating inventories.

There is no SecretSpec dependency. Credentials stay in process environment or
ignored local environment files; `.envrc.local` does not authorize provider actions.
Application semantics and child-credential scoping remain in the env/launcher
code. Ordinary tests use an isolated demo emulator. Provider-backed integration
is a separate, explicitly authorized entry point, not part of ordinary tests.

Check, Test, Build, Plan and Apply are distinct operations. Build loads trusted
pinned tooling and verifies exact-source Check, selected attempt/job, main ancestry
and package version before publishing only an immutable tag/release. GitHub's
automatic source archive is the sole public source handoff; there is no custom
source.zip, separate Rules asset or release.json. Required root inputs are
committed, so downstream Firebase source builds need no Nix or materialization;
`pnpm run build` is ordinary `next build`. Never use mutable operator files or
execute candidate source with the publishing token. API errors are not absence;
existing tags/drafts stop publication rather than trigger automatic recovery.
Preserve exact tag/commit and release immutability verification, actor guards,
serialization, signatures and bounded execution. The public release contract
may change independently of Q1; do not keep custom-asset compatibility or block
public publication on Q1's later migration. Existing immutable releases remain
unchanged; new production phases still require separate approval.

`tf/` is the single root; wrappers select `TF_DIR=tf`. It owns
repository/state infrastructure through Factory modules,
not a reusable Stripe catalog or application topology. Keep the existing bucket,
`repository/prod`, lineage and immutable-release guard. Native Plan calls
OpenTofu directly and stores private GCS saved bytes and optional private
diagnostics; Apply downloads the operator-selected `plan_ref` generation and
applies those exact bytes without replanning. No GitHub artifact or receipt is produced.
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
