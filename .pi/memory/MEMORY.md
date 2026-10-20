# Current project memory — PUBLIC application

Source scope: `quantile-co/quantile.co`, including the unpublished Factory-consumer migration on `refactor/factory-consumer`, package version `0.2.16`. This describes reviewed source, **not a published release or live provider behavior**. Recheck this checkout's root `AGENTS.md`, code, tests and workflows before changes. Never import private Q1/DNS guidance into this public repository.

- This checkout has Next.js Checkout (`app/api/stripe/checkout/route.ts`), signed Stripe/Resend webhook routes, `lib/env/env.ts`, `lib/gcp/firestore.ts` and `lib/welcome/` delivery/store code. HTTP routes are explicit composition roots. Preserve provider signatures, bounded bodies, eligibility, event mode independent of `NODE_ENV`, lazy secret reads, test-operation identity and durable welcome replay semantics. A welcome 200 needs a persisted immutable request, provider acceptance and durable receipt; ignored 200 is not completion.
- `tf/infrastructure/` declares repository settings and dedicated state infrastructure through pinned Factory modules; the former reusable `tf/quantile-co/` Stripe catalog module is **not in this branch**. Do not recreate its product/price/link resources or infer any live catalog state from the historical guide. Catalog changes, application source releases, provider webhook setup and production rollout are distinct reviewed actions.
- `pnpm check` runs lint, type generation/type checking, Knip and asset checks, not tests or builds. Devenv `check:all` adds Factory source/infrastructure checks. `test:all` calls the existing `pnpm test`, including emulator and browser tests, without exclusions or a reduced target. Provider-backed `pnpm test:integration` remains separate. No local test proves live Checkout, routing, cloud IAM, email delivery or refunds. Never put a test Checkout or secret on the live site.
- Check, Test, Build, Plan and Apply are distinct workflows. Check/Test/Plan/Apply call pinned Factory workflows; manual Build remains application-owned. Build requires a successful exact-source Check job and verifies that the source commit is on main before publishing an immutable source/Rules release. It does not run tests. Build, Plan, Apply and provider-backed tests each need separate approval. Keep WIF, locks, provenance and catalog test/live boundaries.

- #source [[hosted-checkout-and-billing]] The current Checkout route omits `payment_method_types` so Stripe selects eligible enabled methods and accepts only exact HTTPS origins for `checkout.stripe.com` and `billing.quantile.co`; tests reject lookalike/HTTP/port variants. `CalendlyEmbed` and the welcome email reference the `/15min` event. The footer-only Billing link is checked in. These source facts do not prove branded TLS, customer Portal access, actual payment methods, or mail delivery. The global memory's October 10 release/Plan/Apply accounts are historical, not reusable approvals. Keep private deployment history in its owning private repo.

The plugin-native `.pi/memory/daily/2026-10-07.md` preserves the former **public historical guides**. Their old module paths and Engram instructions are superseded by this checkout's source. Keep memory public-safe; never commit credentials, customer payloads, saved plans, live Checkout URLs or raw transcripts.
- Public repository boundary: keep source, workflows, documentation and release messages self-contained. Do not reference downstream private repository workflow names, deployment procedures or implementation details. Public release messages should describe only their own publication and asset-verification responsibilities.

## Factory skills and SecretSpec

The Devenv consumer links Factory's `deploy` and `day-zero-deploy` directories,
including their references. These skills cover repository/state infrastructure,
not the custom immutable-source Build or application-provider rollout. This is
an existing installation: never use Day Zero to perform this migration. The
original GCS bucket and `repository/prod` prefix remain in use. Review explicit
resource-address moves, shared repository policy changes, new audit logging,
plan-reader access and the retained `terraform_data.immutable_releases` and
external immutability guard in a separately approved Plan. Standard
`gcp_tf_state_bucket`, `gcp_tf_state_project_id` and `gh_repository_id` outputs
match the shared skill. No state read, migration, Plan or Apply is implied by
source adoption.

Devenv patches Factory's native SecretSpec manifest inline and links the result;
the runtime shell loader remains Factory-owned. Default/Check require no provider
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

Devenv's inline native Biome patch retains app-specific environment access,
import boundaries and Next/React rules on top of Factory's base. The generated
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
asserts version parity and Vitest requires the declared executable rather than
falling back to a user's browser cache. The stock Chromium mismatch at 446px was
resolved by matching the browser, not changing layout or assertions.

A fresh detached worktree with no node_modules passed frozen installation,
full Check, all 437 tests in 43 files, and both application/Storybook builds with
Nix-only PATH and isolated HOME/XDG/package/browser/emulator caches. The locked
Firebase CLI fetched its versioned emulator into that empty cache; Java 21 is
Nix-provided. Integration CLI listener-help smoke tests and effective command
resolution passed without contacting providers. Custom Build loads tools from
the trusted main checkout and restricts operational steps to its pinned PATH
before processing the candidate revision. Provider-backed tests and production
workflows have not run.

## Rollout authorization and preflight

On October 20 the user authorized committing, pushing and landing the completed,
validated migration, followed by main Test, Build, Plan and Apply and the needed
state-address migration. Preserve normal branch protection and inspect exact
saved-plan bytes before Apply; stop on unexpected replacements, destruction or
permission changes. The existing immutable v0.2.15 release cannot be reused;
the proposed next release is v0.2.16. Live main still requires the legacy `All`
context, so source landing must preserve that gate until Terraform adopts
Factory's `All / All` policy. No protection bypass is authorized.

Read-only preflight confirmed the existing prod provider secret and organization
cache-secret access. The state project has no service audit configurations.
The current operator cannot read objects under the saved-plan prefix, and no
`GCP_MAINTAINERS` repository variable existed at preflight. The user approved a
one-time encrypted first-plan handoff and Terraform-managed reader access limited
to `plans/` afterward. Use a new local age key, upload only verified ciphertext
from the same successful Plan attempt, and remove temporary tooling after the
reviewed Apply. Never grant broad/manual IAM or apply an unreviewed plan to
create read access. No state bytes were obtained during preflight.

The approved temporary handoff is implemented in the Plan caller, after the
successful Factory Plan job, with the same protected-main/maintainer/prod/WIF
and production concurrency boundaries. It checks receipt archive and plan
hashes, backend, repository, SHA, attempt, age, private bucket protections and
object generation before encrypting. Synthetic offline tests passed ciphertext
roundtrip and rejection of failed producers, wrong workflow/backend/digest and
expired artifacts. The private key stays outside Git; only its public recipient
is committed. The verified existing operator is the single configured plan
reader; this input grants nothing before the reviewed Terraform Apply.

Final v0.2.16 candidate validation passed Check, all 437 tests and both builds
against Factory `385fda43eadfe7cd6b7fea9b2faab3463011f98f`. Seventeen reformatted
test files have identical executable TypeScript/JSX ASTs before and after the
formatting pass. The temporary `All` job requires successful Factory checks,
never accepting skipped/failed checks. Remove it after state migration installs
`All / All`, together with the encrypted-handoff job/script/recipient and the
temporary age package selection.
