# Google Cloud access

Application resources share one selected `GCP_PROJECT_ID`. Production topology
and runtime IAM/Secret Manager bindings belong to private infrastructure; local
integration uses the `demo-quantile` emulator, not another cloud project.

`firestore.ts` owns the official `@google-cloud/firestore` server SDK client and
caches it lazily per physical project/emulator target within a process. Creating a
client does not create a database. Use the shared `(default)` database; collections
and persistence adapters belong to their domains, not a central application store.
Do not introduce a SQL ORM/query builder for Firestore.

Composition roots read the environment, construct `FirestoreConfig`, and inject
the resulting client into domain stores. This module does not read `process.env`
or import application domains. Always pass the process's emulator setting at that
boundary: the SDK also recognizes `FIRESTORE_EMULATOR_HOST` and gives it precedence.
This module validates project/loopback/port using Zod, but owns no Stripe billing
mode. Routes enforce the live/emulator prohibition; the local launcher enforces
its demo-project restriction. Never construct SDK clients inside welcome delivery
operations. Plain shared schemas/types are fine; no additional config framework.

Cloud clients use ADC. Emulator clients use the SDK's insecure loopback channel
and reserved admin header. Set the emulator client's `clientOptions.universeDomain`
to `googleapis.com`: with SDK 9.3.0/GAX 6.10.0, leaving it implicit caused ADC/metadata
probes just for universe discovery. The REST preference also attempted ADC in local
validation, so use the SDK's default gRPC transport in both cloud and emulator.
No fake private keys, developer ADC or global environment changes are necessary.

SDK retries are not a webhook completion guarantee. A caller deadline can expire
while an issued write still finishes. Domain adapters must retain uncertain state
and require durable read-back before reporting completion. Never put external
email sending inside a Firestore transaction callback.

Emulator tests establish persistence behavior, not production IAM, client rules,
quotas or routing. No production database has been provisioned by this refactor.
