# Webhook routes

There is one supported Stripe event/use case. Keep provider HTTP behavior directly
in `stripe/webhook/route.ts` and `resend/webhook/route.ts`; no event dispatcher,
`events/` hierarchy or extra transport wrappers are needed yet. Private helpers
inside the routes are fine. Shared welcome behavior lives in
[lib/welcome](../../lib/welcome/AGENTS.md), not inside either provider subtree.

## Composition

Routes read environment values, validate with Zod, construct dependencies and inject
them into ordinary functions. Shared types/schemas can cross boundaries. Do not
introduce a DI container, DTO conversion layers, central config object or mandatory
`env.ts` wrapper. Keep global environment reads out of shared welcome behavior.

Validate in stages: verification first, then relevant event/ownership/eligibility,
then persistence. Read sender/reply-to and render only for a new request; read the
sending key only when sending. An ignored renewal and accepted replay must not
need current sender configuration. Never log raw Zod/provider errors or values.

| Runtime variable | Role |
| --- | --- |
| `STRIPE_MODE` | Explicit test/live billing mode, independent of `NODE_ENV` |
| `STRIPE_PRICE_ID` | Selected catalog `price_id` |
| `STRIPE_WEBHOOK_SECRET` | Stripe verification secret |
| `RESEND_API_KEY` | Sending secret |
| `RESEND_WEBHOOK_SECRET` | Callback verification secret |
| `QUANTILE_APP_INSTANCE` | Stable application ownership |
| `GCP_PROJECT_ID` | Shared application project |
| `QUANTILE_EMAIL_FROM` | Approved sender |
| `QUANTILE_EMAIL_REPLY_TO` | Approved reply destination |

Production secrets belong in Secret Manager. Bind project/price from private
infrastructure/catalog outputs. Stripe verification needs no runtime Stripe API key.
Firestore uses ADC/IAM; never expose credentials via `NEXT_PUBLIC_*`.

Roots reject live billing with `FIRESTORE_EMULATOR_HOST`. Pass that ambient setting
explicitly to the GCP client factory because the SDK also recognizes it. The generic
GCP client validates project/emulator targets but owns no billing-mode policy.
Changing price affects historical eligibility; changing app identity affects
ownership. Builds/homepage requests do not validate webhook configuration.

## Behavior and tests

- Bound raw request bodies to 1 MiB; verify signatures against unchanged bytes.
- Stripe: verify explicit mode, reject connected-account events, ignore unsupported
  events, and scope test operations to this app. Check initial paid positive USD
  invoices, complete line pagination, one selected-price line and quantity 1–5.
- Resend: Svix v2 verifies bytes, then strict UTF-8/JSON decoding happens separately.
  Only verified matching `email.sent` callbacks reconcile already-prepared requests.
- Ignored 200 is not completion. Eligible completion requires durable acceptance.
  Return 503 for uncertain persistence/provider work, never ACK on enqueue or an
  in-memory send result. All responses use `Cache-Control: no-store`.
- Keep route validation, eligibility, composition and response tests together in
  `route.test.ts`. Inline single-use fixtures there. `route.integration.test.ts`
  means actual provider-backed testing, not another unit-test classification.

Preserve raw-body/signature/mode/size, ignored-event, immutable replay, live/emulator
rejection, lazy dependency and safe-error coverage when editing routes. Emulator
success does not prove public routing or production readiness. Local commands and
credential handling belong in [lib/dev](../../lib/dev/AGENTS.md).
