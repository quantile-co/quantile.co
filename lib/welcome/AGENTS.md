# Welcome-email delivery and audit

Agent-maintained implementation and recovery knowledge. Source files and
colocated tests are authoritative; do not turn this into a second human README.

## Completion contract

An eligible verified `invoice.payment_succeeded` must pass through:

```text
immutable persisted request -> Resend acceptance -> durable receipt -> Stripe 200
```

The Stripe route owns invoice eligibility: an initial, paid, positive-value USD subscription
invoice, exactly one configured `STRIPE_PRICE_ID` line, quantity 1–5 and usable
subscription/invoice/email identifiers. Incomplete line pagination is an error,
not permission to infer eligibility from a partial list. Renewals and upgrades
are ignored. Test mode additionally requires the app's `quantile_test_id` operation
metadata and replaces the recipient with that operation's Resend simulator address.
This token is internal correlation/idempotency, not another configured instance.

A completed response includes `result: "completed"`, `subscriptionId` and
`resendId`. An ignored event may also receive HTTP 200, without welcome completion.
Do not equate a green Stripe attempt with an accepted email.

## Persistence and races

`store.ts` is this domain's adapter, not a database provisioner. Its injected
Firestore client targets the application's shared `(default)` database. The SDK
client/cache lives in `lib/gcp`; collection shape, validation and acceptance rules
stay here. `delivery.ts` owns its small types and Zod record schema; no separate
model/eligibility/adapter layers are needed. Routes explicitly wire dependencies.
Never read `process.env` or import API route implementations here. Simple shared
schemas/types may cross boundaries. `resend.ts` stays separate and receives its
sending key; `receipt.ts` receives mode/app identity, store access and reporting.
`render.tsx` keeps email JSX separate from HTTP handling. Both providers share
these records, but only Stripe may initiate a welcome operation.

- The TypeScript/Zod record is a pending/accepted union. Accepted records require
  a provider ID and acceptance timestamp. Validation must not normalize or rewrite
  the persisted request body; replay uses its exact original bytes.
- Logical operation key: `welcome/{mode}/{subscriptionId}`. Firestore document:
  `welcome-emails/{mode}-{subscriptionId}`. Keep the production app instance
  stable across releases; it is ownership, not a deployment version.
- Persist the entire exact Resend JSON request before sending. Atomic create
  selects one winner under concurrent renderers. Retries use that stored body
  and key, never re-render with a newer deployment's copy/configuration.
- `schema`, identity, `request`, `idempotencyKey` and `createdAt` are immutable.
  `acceptedAt` plus `resendId` record provider acceptance, not inbox delivery.
  `callbackReceivedAt` separately records a verified callback reconciliation.
- Ownership compares mode, subscription, invoice, app instance and `testId`;
  event ID may differ for a logical duplicate. Do not overwrite another operation.
- Official SDK `DocumentReference.create()` atomically prepares an immutable
  request. `update(fields, { lastUpdateTime })` uses Commit with an update mask
  and timestamp precondition for receipt CAS. Require read-back verification.
  The same SDK path is exercised by emulator tests, without handwritten REST codecs.
- Identical receipts converge; a different accepted ID cannot replace the first.
  A concurrent callback may require a provider retry to add its timestamp after
  an API receipt wins the CAS. Never put an external email send in a transaction.
- The verified `email.sent` callback must match stored identity, correlation tags,
  sender, recipient and subject. It can reconcile a lost API response or receipt
  write, but must never create a missing request or invent Stripe eligibility.
- Firestore client rules deny access. The server uses ADC; emulator requests use
  its reserved admin credential. Emulator tests do not validate production IAM
  or client-rule enforcement. The adapter bounds each caller wait to three seconds;
  that timeout does not cancel an already-issued SDK operation or its retries.
  A late write may succeed, so propagate ambiguity rather than ACK early or erase
  state. These per-call waits are not a total handler budget.

## Audit the invoice population

Do not begin with only failed webhook attempts: events that never reached an
endpoint will be absent there. Run a bounded audit with an explicit Stripe
account, mode, applicable price IDs, app/test-operation scope and time cutoff.

1. Enumerate and paginate the initial paid capacity-invoice population from
   Stripe for the audit window. Check eligibility fields; retain malformed or
   inconsistent candidates as explicit exceptions rather than silently omitting
   them. Avoid excluding older invoices solely because today's price/config changed.
2. Join each eligible invoice/subscription to its Firestore operation record.
   Validate its identity and immutable request, not merely the document's existence.
3. Classify every candidate:
   - **Accepted/completed:** durable accepted ID, with API/provider evidence.
   - **Accepted, callback pending:** receipt exists but no callback timestamp;
     investigate callback routing separately, without resending the email.
   - **Pending/ambiguous:** request exists but no durable receipt; the first send
     may have succeeded even if the application timed out or lost its write.
   - **No record:** investigate missing routing, ignored responses, configuration,
     eligibility errors or failed persistence. This is not proof that Stripe never
     emitted an event, nor permission to send without checking provider evidence.
   - **Conflicting/corrupt:** identity, request or receipt disagrees; stop automatic
     repair and preserve evidence.
4. Correlate Stripe event/destination attempts, safe application logs and Resend
   accepted email IDs/tags. A durable receipt with unsuccessful Stripe delivery
   can mean a lost acknowledgement, not an unsent email.
5. Report the cutoff, population size, each classification and unresolved gaps.
   Separate completed logical operations from distinct Resend-accepted emails;
   rare duplicates can make those counts differ. Never label accepted as delivered.

Provider log/event retention limits can make an old outcome unknowable. Record
that uncertainty instead of treating an empty search as proof of nonacceptance.
Do not put recipient data, stored requests, credentials or raw provider logs in Git.

## Recovery without a background worker

Provider retries drive automatic processing. There is no scheduled scanner or
custom recovery worker. Investigate a specific owned operation before replaying it.

- If already accepted, replaying the owned Stripe event should return the same
  accepted ID without rendering/sending again. A lost Stripe ACK needs no new email.
- If Resend acceptance is known but the receipt is missing, prefer replaying the
  matching signed Resend callback. Callback replay does not resend the email.
- Otherwise retry the verified eligible Stripe event using the exact stored
  request and stable idempotency key. Never delete a pending record to force a send.
- Resend's idempotency window is 24 hours. After it expires, the same key can
  produce another accepted email. A timeout alone cannot establish whether the
  first email was accepted. Check current provider rules and retained evidence
  before an operator-authorized late replay.
- One late resend after an unknown first outcome can yield 1–2 accepted emails;
  repeated late retries can exceed two. Do not claim lifetime exactly-once delivery
  or a universal duplicate cap. These are duplicate emails, not duplicate charges
  or subscriptions: this handler does not create either billing resource.
- Preserve the first durable accepted ID when conflicting receipts arrive. Any
  later accepted IDs belong in the investigation; do not overwrite the record to
  conceal duplicates or fabricate evidence.

## Validation boundaries

`delivery.test.ts` covers immutable reuse, lost responses and callback recovery.
`store.test.ts` exercises the official SDK against the emulator and runs a common
contract against the memory implementation. Preserve concurrent preparation,
API/callback races, ownership rejection, immutable fields, and timestamp replay.
SDK emulator contention can retry ABORTED writes for seconds; tests permit a safe
bounded failure but require retry to converge on the same winning request. Do not
raise production deadlines merely to force every concurrent attempt to succeed.
Route unit tests cover signatures, eligibility, composition and HTTP responses.

The provider-backed suite at `../../app/api/stripe/webhook/route.integration.test.ts` additionally
checks actual Checkout, callback and replay when configured. Its existence or
passing mocked/emulator tests is not proof that it has passed against providers.
Before production, obtain evidence for real routing, permissions/quotas, failure
recovery, cloud IAM and the App Hosting runtime; approve sender/copy separately.
