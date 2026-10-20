# Current project memory — PUBLIC application

Source scope: `quantile-co/quantile.co`, including the verified Factory repository/state migration and immutable source release `v0.2.17`. This does **not** verify application-provider behavior or publish the site. Recheck this checkout's root `AGENTS.md`, code, tests and workflows before changes. Never import private Q1/DNS guidance into this public repository.

- This checkout has Next.js Checkout (`app/api/stripe/checkout/route.ts`), signed Stripe/Resend webhook routes, `lib/env/env.ts`, `lib/gcp/firestore.ts` and `lib/welcome/` delivery/store code. HTTP routes are explicit composition roots. Preserve provider signatures, bounded bodies, eligibility, event mode independent of `NODE_ENV`, lazy secret reads, test-operation identity and durable welcome replay semantics. A welcome 200 needs a persisted immutable request, provider acceptance and durable receipt; ignored 200 is not completion.
- `tf/infrastructure/` declares repository settings and dedicated state infrastructure through pinned Factory modules; the former reusable `tf/quantile-co/` Stripe catalog module is **not in this branch**. Do not recreate its product/price/link resources or infer any live catalog state from the historical guide. Catalog changes, application source releases, provider webhook setup and production rollout are distinct reviewed actions.
- `pnpm check` runs lint, type generation/type checking, Knip and asset checks, not tests or builds. Devenv `check:all` adds Factory source/infrastructure checks. `test:all` calls the existing `pnpm test`, including emulator and browser tests, without exclusions or a reduced target. Provider-backed `test:integration` runs the existing pnpm script after dependency installation and remains separate from `test:all`. No local test proves live Checkout, routing, cloud IAM, email delivery or refunds. Never put a test Checkout or secret on the live site.
- Check, Test, Build, Plan and Apply are distinct workflows. Check/Test/Plan/Apply call pinned Factory workflows; manual Build remains application-owned. Build requires a successful exact-source Check job and verifies that the source commit is on main before publishing an immutable source/Rules release. It does not run tests. Build, Plan, Apply and provider-backed tests each need separate approval. Keep WIF, locks, provenance and catalog test/live boundaries.

- #source [[hosted-checkout-and-billing]] The current Checkout route omits `payment_method_types` so Stripe selects eligible enabled methods and accepts only exact HTTPS origins for `checkout.stripe.com` and `billing.quantile.co`; tests reject lookalike/HTTP/port variants. `CalendlyEmbed` and the welcome email reference the `/15min` event. The footer-only Billing link is checked in. These source facts do not prove branded TLS, customer Portal access, actual payment methods, or mail delivery. The global memory's October 10 release/Plan/Apply accounts are historical, not reusable approvals. Keep private deployment history in its owning private repo.

The plugin-native `.pi/memory/daily/2026-10-07.md` preserves the former **public historical guides**. Their old module paths and Engram instructions are superseded by this checkout's source. Keep memory public-safe; never commit credentials, customer payloads, saved plans, live Checkout URLs or raw transcripts.
- Public repository boundary: keep source, workflows, documentation and release messages self-contained. Do not reference downstream private repository workflow names, deployment procedures or implementation details. Public release messages should describe only their own publication and asset-verification responsibilities.

## Factory skills and SecretSpec

The consumer also links Factory's generic `devenv-tasks` skill. It discovers
names, descriptions, implementations and dependency relationships using the
installed CLI and project configuration, with no fixed task inventory or
Factory-specific assumptions. Discovery alone does not execute tasks. The
user requested no README listing for this skill.

The user approved 15-minute shared Check/Test jobs to accommodate cold or
partially cached Nix closures. Both initial Checks of `d3a2416` reached the
old 10-minute limit downloading dependencies, before checks ran; push Check
39468727431 attempt 2 passed unchanged. Factory `b9f948b` introduced that budget;
the current pin is recorded below. Preserve all checks,
cache signatures and production guards; no Terraform module content changed.

The Devenv consumer links Factory's `deploy` and `day-zero-deploy` directories,
including their references. These skills cover repository/state infrastructure,
not the custom immutable-source Build or application-provider rollout. This is
an existing installation: never use Day Zero to perform this migration. The
original GCS bucket and `repository/prod` prefix remain in use. The reviewed
migration moved ten managed addresses into Factory modules without replacements
or deletions. It retained `terraform_data.immutable_releases` and the external
immutability guard. Standard `gcp_tf_state_bucket`, `gcp_tf_state_project_id`
and `gh_repository_id` outputs match the shared skill. Normal private saved-plan
retrieval now works through the approved prefix-only reader; state-object access
remains denied. New production operations still need separate authorization.

`nix/secretspec.nix` patches Factory's native SecretSpec manifest; Devenv links
the result. The runtime shell loader remains Factory-owned. Default/Check require no provider
credentials; the CI Test profile requires only
`CACHIX_AUTH_TOKEN`. Plan/Apply use runtime `GITHUB_TOKEN`, `REST_API_BEARER`, WIF
ADC, backend identity and `TF_VAR_*` infrastructure inputs. Caller mappings retain
`TF_STATE_BUCKET` and `GCP_QUANTILE_CO_FOLDER_ID`; `GCP_MAINTAINERS` is a distinct
Google-account JSON array needed for private plan review. Verify these inputs,
protected `GH_REPO_TOKEN` access and token permissions before deployment.
The immutable-release API guard uses the provider credential, not Apply's
artifact-reading `GH_TOKEN`.

The manifest uses project label `quantile.co` and only the `env` provider.
Inline native patches preserve Factory's infrastructure profiles and add `build`,
`integration`, `integration-target`, `integration-cleanup` and `runtime` profiles.
These declare application credentials, nonsecret configuration and optional
launcher-generated values; generated values must not be prepopulated by an
operator. No real value is embedded in Nix or committed. Selecting an integration
profile does not authorize provider operations. Required values must already be
in the process environment when entering that profile; SecretSpec does not load
Next's `.env*` files. It validates presence/nonempty required values, not app
semantics, and does not clear ambient credentials. `lib/env/env.ts`, Next's env
loading and the launcher's credential scoping remain authoritative. Ordinary
`pnpm test` starts its own demo-project Firestore emulator and excludes managed
provider credentials from test children. Explicit integration needs development
Stripe credentials/catalog identity, Resend sending/management access and email
settings, plus separately authenticated ngrok; webhook secrets and listener
identity can be launcher-generated. Remote-target testing has additional explicit
project/identity/signing requirements. Do not put these inputs in default,
Check, or CI Test profiles, and never confuse the state project's CI
`GCP_PROJECT_ID` with an application database target.

`nix/biome.nix` retains app-specific environment access, import boundaries and
Next/React rules on top of Factory's native base. The generated
SecretSpec file is linked; Biome's root config is formatted during generation
and copied because Biome 2.5.15 panics on a symlinked root config. No consumer
`etc/` directory is needed. These policies and
the custom release contract remain consumer-owned; no shared rule is weakened.
Hook installation is explicit through `install:git:hooks`; importing the flake
or entering the shell does not install hooks.

## Declared runtime dependencies

Keep README setup concise; do not list the tools Devenv provides. The executable
configuration is authoritative, and a prose inventory would become stale.

Every required CLI and native runtime dependency must come from pinned
Devenv/Nix inputs or locked language packages, not host installations, global
packages or undeclared caches. Audit ordinary development, checks, emulator and
browser tests, builds, and explicitly authorized integration/deployment paths.
Keep Nix/direnv bootstrap requirements explicit; validate with restricted PATH
and isolated caches. Never skip assertions or test projects to hide a missing
dependency.

Factory now supplies individual Bash, Coreutils, Diffutils, Stripe CLI, ngrok,
Resend CLI and Playwright packages; the consumer selects them explicitly.
There is no release-shell bundle. ngrok's license permission is consumer-scoped.
Playwright's Nix-patched browser and fonts match the npm version; the consumer
uses Factory's `withVersion` helper and Vitest requires the declared executable rather than
falling back to a user's browser cache. The stock Chromium mismatch at 446px was
resolved by matching the browser, not changing layout or assertions.

A fresh detached worktree with no node_modules passed frozen installation,
full Check, all 437 tests in 43 files, and both application/Storybook builds with
Nix-only PATH and isolated HOME/XDG/package/browser/emulator caches. The locked
Firebase CLI fetched its versioned emulator into that empty cache; Java 21 is
Nix-provided. Integration CLI listener-help smoke tests and effective command
resolution passed without contacting providers. Custom Build loads tools from
the trusted main checkout and restricts operational steps to its pinned PATH
before processing the candidate revision. Provider-backed tests have not run;
main-workflow outcomes are recorded below.

## Consumer configuration and release tooling

Factory is pinned consistently to `8293b5698cdf411da2fdc2b4fe969031796c8d95`
across inputs, locks, workflow callers and Terraform module sources. Its
zero-argument `check-devenv-locks` retains CI index validation. Biome and
SecretSpec generation moved out of `devenv.nix` without changing generated
bytes. README Development starts with Install; Checks, Tests and Build are
separate, with no Assets subsection or tool inventory.

The custom Build workflow invokes `build:release` from the trusted tooling
checkout. `nix/build.nix` owns the executable and its pinned, restricted PATH.
It requires a successful exact-source Check and job from the selected attempt
and main ancestry. All packaged inputs come from Git objects at the reviewed SHA. Existing tags or drafts stop publication for
manual inspection; API failures are never treated as absence. Draft recovery,
provenance rewriting and semantic ZIP comparison are removed. Both draft and
published metadata/digests, the tag target and downloaded asset bytes remain
verified. Build runs serialize without cancellation; actor/main gates, signed
caches, permissions and the twenty-minute bound remain in the workflow.

Testing retains one offline regression for a failed tag lookup, not a simulated
GitHub release lifecycle. This adds one test to the unchanged 437-test ordinary
suite. Local Check and all 438 tests in 44 files passed with the final Factory
pin. Generated Biome and SecretSpec bytes still match the pre-extraction hashes.
Application, Storybook and asset builds also passed without generated-source
changes. No provider-backed tests or release publication are part of validation.
The user separately authorized main Test, immutable-source Build `v0.2.17`, and
Plan/review/Apply after source publication. Keep main fixed during plan review;
stop on unexpected infrastructure changes. This is not site-deployment or
provider-backed integration-test authorization.

## Configuration-refactor rollout outcome

Signed source `42561c3efc35302b9f208f72a4d9b20f4ff95f1e` passed exact-head Check
`39492311810` and landed by protected fast-forward. Authorized main Test
`39492936570` and Build `39493415503` succeeded. Immutable `v0.2.17` binds that
source to the verified Check/Build provenance; all three asset hashes, Rules
bytes and source archive were independently checked. Git ZIP timestamps use
the process timezone; local byte comparison matched after using the runner's UTC.

Plan `39494880931`, receipt `12297920416`, was retrieved through the normal
plans-only reader after the operator reauthenticated. Producer, revision, age,
backend, archive digest, exact GCS generation and plan digest were verified.
The reviewed plan reported no changes across all sixteen managed resources.
Authorized Apply `39496148733` succeeded on those exact saved bytes. The review
is closed; no saved-plan approval carries forward to another operation. No
provider-backed tests or site deployment ran, and private evidence stays outside Git.

## Migration authorization and preflight (historical)

On October 20 the user authorized committing, pushing and landing the completed,
validated migration, followed by main Test, Build, Plan and Apply and the needed
state-address migration. Preserve normal branch protection and inspect exact
saved-plan bytes before Apply; stop on unexpected replacements, destruction or
permission changes. The existing immutable v0.2.15 release cannot be reused;
v0.2.16 was selected instead. At migration start, main required the legacy `All`
context, so source landing preserved that gate until Terraform adopted
Factory's `All / All` policy. No protection bypass was used.

Read-only preflight confirmed the existing prod provider secret and organization
cache-secret access. The state project has no service audit configurations.
The current operator cannot read objects under the saved-plan prefix, and no
`GCP_MAINTAINERS` repository variable existed at preflight. The user approved a
one-time encrypted first-plan handoff and Terraform-managed reader access limited
to `plans/` afterward. Use a new local age key, upload only verified ciphertext
from the same successful Plan attempt, and remove temporary tooling after the
reviewed Apply. Never grant broad/manual IAM or apply an unreviewed plan to
create read access. No state bytes were obtained during preflight.

The temporary encrypted handoff followed the successful Factory Plan job under
the same protected-main/maintainer/prod/WIF and concurrency boundaries. It
verified receipt and plan digests, backend, repository, revision, attempt, age,
bucket protections and exact object generation before encrypting. Synthetic
roundtrip and rejection tests passed. Only the public recipient was committed;
the private key and decrypted evidence stayed outside Git. The handoff and its
recipient/package were removed after Apply and normal reader access were verified.

Final v0.2.16 candidate validation passed Check, all 437 tests and both builds
against Factory `385fda43eadfe7cd6b7fea9b2faab3463011f98f`. Seventeen reformatted
test files have identical executable TypeScript/JSX ASTs before and after the
formatting pass. The temporary `All` job required successful Factory checks,
never accepting skipped/failed checks. Post-Apply cleanup removes that job,
the encrypted-handoff job/script/recipient, its age package selection, `moved.tf`
and the legacy provider alias. Do not retain migration shims as permanent
architecture. Existing backend/folder caller inputs remain explicit consumer
configuration, not a compatibility layer.

## Main rollout progress

Signed candidate `5205ce8` passed push Check `39398931150` and PR Check
`39399044320`; normal squash merge of PR #88 produced verified main `3c1959c`.
Because the installed policy required a PR and squash changes the commit SHA,
a verification branch pointing to that exact main commit produced successful
push Check `39399459320`. Main Test `39399922207` passed its full Check/test task.

Authorized Build `39400671696` was stopped during tooling bootstrap, before
source packaging or publication; both operational steps were skipped. Logs
confirmed 1,869 derivations being built because this new bootstrap omitted the
public cache settings already used by Factory Check/Test/Plan/Apply. It was not
a failed application test or a release write. Align Build and the temporary
handoff bootstrap with those existing signed caches and bound Build at twenty
minutes. No new cache trust, token, WIF permission or provider credential is
introduced. The correction landed through PR #95 as `a907389`; exact-main
Check `39403052631` and the authorized main Test `39463399029` passed. The user
approved continuing Test/Build and the reviewed Plan/Apply sequence.

The requested `build:assets` task runs `pnpm assets:generate` after dependency
installation and before `build:all`. The README documents that command under Build.
Keep task listings ordered Check, Fix, Test; this is not authorization to run
fixes automatically during checks or tests. Local task execution generated all
21 assets without source changes, then built the application and Storybook;
Check passed. PR #96 also adopted generic task discovery, the approved README
cleanup and Factory's 15-minute Check/Test jobs. Both exact-head Checks passed;
push Check `39472255080` needed 12 minutes 59 seconds, exceeding the old limit.
Normal squash merge produced main `f1a7f0e487d887b4c7dfcccd7abf4fb55c6a6ebc`.
Exact-main Check `39474323719` and full main Test `39474384237` passed.

Build `39475543087` published immutable `v0.2.16` from that exact source. The tag,
all three asset digests, Check/Build provenance and complete archive contents
were verified. This is a source/Rules release, not a site deployment.

Plan `39476218139` produced receipt `12288689117`. Both artifact archive digests,
producer identity/age/revision, backend fingerprint and decrypted plan digest
were verified privately. Full review found ten address moves, five additions,
four updates, no replacements or deletions, unchanged CI Owner and state
protections, and exactly the approved plans-only reader. Project and ancestor
audit configurations were checked before adding all three Storage audit types.
Authorized Apply `39477215702` succeeded on those exact saved bytes.

Live verification confirmed signed/linear main with `All / All`, squash-only
merges, optional PRs, no legacy push restriction, main-only `prod`, pinned
selected actions, approval for all external PR workflows and immutable releases.
Storage audit logging has no exemptions. A normal Google-user download matched
the reviewed saved plan; state-object metadata remained inaccessible. No manual
IAM grant, local Apply or backend reset was used.

Cleanup passed local Check and all 437 tests, plus push Check `39478406579`
and PR Check `39478413044`. PR #97 landed as
`7183229070f1623beaaff10fcd80483b2ea0fbe5`; exact-main Check `39479245052` passed.
The ordinary Plan `39479160577`, receipt `12291141547`, reported no changes.
Normal private GCS retrieval verified producer/revision/age, archive and plan
digests, exact generation and backend identity without the encrypted handoff.
Both saved state snapshots contain all sixteen managed resources at canonical
module addresses (except the intentionally app-owned immutability marker),
with no legacy provider bindings or pending moves. Nonempty backend lineage is
unchanged and its serial advanced exactly once for the migration Apply.
No further Apply is needed; the convergence review is closed. Temporary
migration source is removed, and source publication plus repository/state
migration are complete. Provider-backed application tests and site deployment
were not performed.
