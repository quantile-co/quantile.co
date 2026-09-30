# Local development and integration

`scripts/dev.ts` delegates to `run.ts`. This is a development/test launcher, never
production startup. Keep ordinary modules and explicit dependencies, not a DI
container, ports/adapters hierarchy, global config registry or an OS-env allowlist.

## Layout

- `run.ts`: Commander parsing, selected-input validation, environment loading,
  concrete wiring and command execution.
- `process.ts`: child processes, bounded shutdown, readiness and credential scoping.
- `emulator.ts`: generated Firebase configuration and emulator lifecycle.
- `integration.ts`: ngrok/Stripe/Resend coordination and Resend registry access.
- `ownership.ts`: checkout identity, journals, cleanup locks and verified deletion.

Tests stay with the responsible modules. Prefer a few cohesive files; do not
extract each helper into a module. Typed values, functions and simple shared data
schemas are enough. Integration receives explicit credentials/targets and a process
runner; it does not inspect `process.env`.

## Commands

| Command | Lifecycle |
| --- | --- |
| `pnpm dev` | Next.js + local Firestore emulator; no provider credentials |
| `pnpm dev --port <port>` | Same, with an explicit app port |
| `pnpm dev --integration` | Same + remote-service integration |
| `pnpm dev --cleanup-integration` | Verify cleanup of this checkout's stopped integration |
| `pnpm test` | Isolated emulator, unit and Chromium Storybook tests |
| `pnpm test:integration` | Full local stack + real-provider tests; dynamic app port |
| `pnpm test:integration --target <webhook-url>` | Tests only; caller owns target infrastructure |
| `pnpm check` | Lint, types, Knip, tests, assets and both builds |

Only `pnpm test` and `pnpm test:integration` are test entrypoints. `--test` is an
internal package-script flag. `--target` requires integration tests; `--port` is
for development; cleanup is exclusive. Parse help/invalid arguments before loading
files or acquiring resources. Java JDK 21+ is required for ordinary development
and tests. Firebase CLI may download the emulator on first use.

## Configuration precedence

1. Explicit supported CLI option (currently the development port/target).
2. Existing environment value.
3. Next.js `.env*` precedence and expansion, loaded by `@next/env` outside Next.
4. Source defaults (e.g. app port 3000).

Use development files for ordinary/integrated development and provider-test setup.
Unit tests use `NODE_ENV=test`, so `.env.local` is not loaded. Child test runners
also receive `NODE_ENV=test`; billing mode is a separate setting. Never commit
local credentials or log Zod issues/raw provider exceptions; report setting names
and safe reason codes only. No replacement `env.ts` is needed by default.

Safety overrides are not configurable precedence: managed local databases always
use `demo-quantile`; unit tests always allocate a fresh emulator and override
inherited cloud targeting. An explicitly supplied development emulator must have
`GCP_PROJECT_ID=demo-quantile` and a valid loopback host/port. Stop owned emulators
with the launcher; never terminate a caller-owned one.

## Remote-service inputs

`--integration` requires these seven supplied values:

| Variable | Role |
| --- | --- |
| `STRIPE_MODE` | Explicitly `test`; remote integration refuses live mode |
| `STRIPE_TEST_API_KEY` | Stripe CLI and test-object access |
| `STRIPE_PRICE_ID` | Shared test catalog price |
| `RESEND_API_KEY` | Application sending credential |
| `RESEND_MANAGEMENT_API_KEY` | Webhook management/email inspection, not a sandbox selector |
| `QUANTILE_EMAIL_FROM` | Approved sender |
| `QUANTILE_EMAIL_REPLY_TO` | Approved reply destination |

Optional: app identity, `PORT`, `NGROK_CONFIG`, `NGROK_URL` (HTTPS origin, optionally
with `{appInstance}`), or a caller-owned demo emulator. Reuse installed/authenticated
ngrok config; never copy/print its token. Its generated secret-free overlay disables
inspection/update checking. No provider processes are started without `--integration`.

An explicit `--target` must be `/api/stripe/webhook` on HTTPS or loopback HTTP,
without credentials/query/fragment. Supply matching app identity, test mode/key/price,
Stripe replay signing secret, management key, GCP project and ADC/emulator access.
It starts no local infrastructure and creates no identity/journal. It does not need
sending credentials. `QUANTILE_STRIPE_WEBHOOK_URL` is an internal launcher-to-suite
bridge; an ambient supplied value is rejected. No old flag/environment aliases.

Ordinary OS/tool settings inherit normally. `process.ts` scopes only the known
provider/cloud credentials used here. Runtime children exclude management/test keys;
unit tests exclude all of them; target tests retain their required cloud access.
Excluded credentials are blanked for app/test children to prevent dotenv reload,
and omitted for tools. This is accidental-propagation protection, not a sandbox.
CI credentials must be withheld from validation jobs independently.

## Identity, ownership and cleanup

The sole configured identity is `QUANTILE_APP_INSTANCE`, otherwise persisted in
`.quantile/app-instance`. Production identity stays stable across releases. Internal
lifecycle tokens and per-Checkout test IDs are concurrency/idempotency safeguards,
not additional configured instances. Same-checkout remote integration is exclusive;
separate checkouts and isolated test emulators need not be globally serialized.

```text
Stripe -> Stripe CLI ----------------> Next.js
Resend -> ngrok -> Resend CLI --------> Next.js
```

Stripe uses `--latest` and creates no Dashboard endpoint. Resend creates an owned
`email.sent` endpoint whose token-bearing URL is journaled before registration.
Never pool origins between owners, evict other listeners or broadly delete webhooks.

- Atomically publish complete identity/journal files. Journal version 2 uses
  `token`; unknown/old versions fail closed and require verified investigation.
- `.quantile/webhooks.json` records ownership, not secrets. Before manual cleanup,
  inspect host/token and confirm the process has stopped. Never kill a journal PID.
- `.quantile/webhooks-cleanup/owner.json` serializes cleanup. An interrupted guard
  needs investigation; missing/unreadable metadata does not prove removal is safe.
- Validate every candidate's ID, exact URL and sole event subscription before any
  deletion. Confirm deletion; retain ownership on uncertainty.
- Remove the overlay before releasing ownership so delayed cleanup cannot remove
  a successor's configuration. Stop process groups in reverse order, even after
  a stop failure, and abort losing readiness polls.
- If cleanup is uncertain, inspect processes and `.quantile/`; retry
  `pnpm dev --cleanup-integration` only after resolving the uncertainty.

Local tests prove useful process/emulator behavior, not provider permissions,
quotas, routing or cloud IAM. Real-provider testing requires separate authorization.
See the [welcome guide](../welcome/AGENTS.md) for delivery/audit/recovery guarantees.
