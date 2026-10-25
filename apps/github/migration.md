# One-time infrastructure backend migration proposal

This is a review proposal, not an executable procedure or dispatch approval.
The common protocol must be confirmed before any main advancement, production
workflow dispatch or state write. Remove this temporary proposal with the
migration machinery after the separately approved cutover is verified.

## Repository bindings

| Binding | Value |
| --- | --- |
| Repository | `quantile-co/quantile.co` |
| Immutable repository ID | `1386602830` |
| Reviewed source candidate | `b7e3789778f6823314d59d7150a5eca092544f32` |
| Candidate exact-head Check | `40164948733`, successful Namespace `All` |
| Current main | `bf813129c56e84e4ceff191af4b1dc6166f8e3a7` |
| Terraform root | `tf/` |
| GCP project | `quantile-co-9e46` |
| Existing bucket | `quantile-co-9e46-tf-state` |
| Source prefix | `repository/prod` |
| Destination prefix | `quantile.co/prod/infrastructure` |
| Expected workspace | `default`, to be verified through OIDC |
| Expected source object | `repository/prod/default.tfstate`, not yet verified |
| Expected destination object | `quantile.co/prod/infrastructure/default.tfstate`, not yet verified |
| Native CLI | OpenTofu `1.13.1` |

Repository Actions variables confirm the project, bucket and these direct-WIF
bindings; they are not evidence of current bucket contents or effective IAM:

- Pool: `projects/86084514682/locations/global/workloadIdentityPools/github`.
- Provider: `projects/86084514682/locations/global/workloadIdentityPools/github/providers/quantile-co-actions-oidc-45af`.
- Source-defined owner pairing remains `aj@quantile.co` / `aj-welch`; no members.

The existing installation contract uses `repository/prod`. The candidate CLI
already selects the destination; it must not be used for a normal Plan or Apply
against an unmigrated destination. No in-repository `terraform_remote_state`
reader was found. Cross-repository coordination belongs to the common protocol review.

## Existing protection and writers

- `prod` uses a custom branch policy allowing only `main`.
- Main requires strict `All`, enforces administrators, and prohibits force pushes
  and deletion. The reviewed candidate's SSH signature is verified by GitHub.
- Preserve `.github/workflows/plan.yaml` and `apply.yaml`, manual main/prod gates,
  `namespace-profile-quantile-4x8`, and `site-production` concurrency with
  `cancel-in-progress: false`. Migration must share that same concurrency group.
- The only checked-in state-writer entry points are Plan and Apply. Read-only
  metadata preflight found none in progress, queued, waiting, pending or requested.
  Recheck immediately before the eventual migration and before releasing its gate.
- Check, Test and source-release Build do not select or migrate this backend.
  This phase nevertheless authorizes none of their production operations.
- Use existing workflow OIDC, not a human Google login, a new service account,
  provider PATs or new IAM. The migration job needs `contents:
  read`, `id-token: write`, and `actions: read` for writer inspection. It must not
  receive `GH_REPO_TOKEN` or application provider credentials.

## Protected bootstrap requiring common-protocol agreement

An existing manual main workflow is the proposed entry point: add a temporary,
explicit migration-only branch to `plan.yaml`, not a renamed workflow or a
branch-dispatched production job. The migration path must never invoke the normal
Plan task. Preserve its main/prod/Namespace/auth/concurrency controls and render
changes through the owning Nix customization, not an unmanaged YAML patch.

The coordinating review must first approve how that bridge reaches main without activating the
candidate's new backend mapping prematurely. Normal resource Plan/Apply must be
held throughout the bridge and cutover, including old queued jobs or reruns.
Either stage the migration-only bridge before source activation, or use a reviewed
hard migration gate; do not fast-forward the current candidate and assume an empty
destination is safe. Any changed integration commit needs its own signature and
exact-head passing `All`. The final source activation is a separate checked step.

## Proposed one-shot protocol

1. Verify the exact repository/workflow/main/actor/prod/OIDC bindings and pinned
    OpenTofu version. Assert the fixed project and bucket; accept no arbitrary
    backend, workspace, credential or CLI-argument overrides. Use restrictive
    private scratch outside Git and the Nix store. Do not log state or tokens.
2. With workflow OIDC, inspect bucket safeguards/effective access, enumerate
    source workspaces and object generations, and require exactly the reviewed
    default state. Missing state, unexpected workspace/version, active lock,
    access failure or an additional writer is a hard stop. Confirm destination
    absence with successful typed storage responses, including historical and
    soft-deleted objects where applicable; failed listing is not absence.
3. Download the exact source generation privately. Validate format/version,
    lineage, serial, all resource instances/provider bindings, outputs and opaque
    state fields. Record a lossless canonical digest of the complete document,
    not just addresses or counts. No schema upgrade or silent numeric rounding.
4. Create restricted backups and a verification manifest with storage
    generation-match-zero preconditions under
    `state-migrations/1386602830/RUN_ID/ATTEMPT/infrastructure/`, outside `plans/`.
    Verify uploaded bytes/generations. Existing backup objects are an error.
    Human plan-reader grants are conditioned on `plans/`; do not broaden them or
    upload any state-bearing evidence to GitHub artifacts, summaries or logs.
5. Use a fresh backend-only scratch configuration and fresh `TF_DATA_DIR`, not
    the resource root or its cached backend metadata. Initialize the verified
    source, verify only the default workspace, then run native `init
    -migrate-state` toward the fixed destination. Keep native source/destination
    locking enabled with zero lock-wait time. No `-force-copy`, `-lock=false`,
    state push/import, resource Plan/Apply, provider operations or automatic retry.
    If native confirmation is automated, permit only the reviewed empty-backend
    prompt once; reject a nonempty-destination description or any other prompt.
    Do not blindly pipe unlimited affirmative input.
6. Independently read back the destination through its backend and by exact
    storage generation. Require full lossless canonical equality, identical
    lineage/serial/resources/outputs and the expected native version. Re-read
    source and require its original generation and complete contents unchanged.
    Check locks/writers again. Persist post-verification evidence privately with
    create-only preconditions. Any discrepancy stops before retirement.
7. Retire the old live source explicitly only after successful verification.
    Native migration does not delete it. Recommendation for common review: acquire
    a create-only native-compatible retirement guard on the old default lock key
    after native migration releases its own locks, then generation-conditionally
    retire the exact verified old live state object. Never overwrite/remove an
    observed lock or delete noncurrent state generations. Keep backups outside
    `plans/`. A bare copy with two writable live states is not convergence; merely
    deleting the old state without fencing stale workflow code can allow empty
    state recreation. The common review must approve the exact guard/retirement semantics.
8. Verify the destination is still identical and exclusively authoritative, source
    retirement/guard is as reviewed, and no ordinary active backend locks remain.
    Only then activate the checked source mapping. Remove temporary workflow/code
    after final checked cleanup while retaining approved private recovery evidence
    and any explicitly required retirement fence.
9. Establish a fresh-plan boundary. No resource Plan or Apply is authorized by
    this migration. Old saved plans must not be replayed after the move. Any
    subsequent resource operation needs fresh explicit review and authorization.

Failures and uncertain writes retain private evidence and stop. There is no
forced overwrite, automatic retry, automatic rollback, old-prefix runtime
fallback, human login, IAM grant or resource mutation in this proposal.

## Blocking decisions and unverified facts

The coordinating review has not yet confirmed the common protocol, protected bridge staging,
lossless comparison implementation, source retirement/fencing semantics or failure
recovery handling. No executable migration runner or workflow branch is enabled.
Actual source state/workspaces/generations/locks, destination non-use, bucket
safeguards and effective OIDC permissions remain unverified until an explicitly
approved protected preflight. Human Google authentication is not part of this protocol.

## Pinned native behavior reviewed

OpenTofu `v1.13.1` implementation:

- [Migration command](https://github.com/opentofu/opentofu/blob/233700b795b6d2372f1c56ed57a4abaec9d36475/internal/command/meta_backend_migrate.go)
  locks and refreshes source/destination before migration, then persists the
  destination; it does not retire the old GCS state.
- [State migration](https://github.com/opentofu/opentofu/blob/233700b795b6d2372f1c56ed57a4abaec9d36475/internal/states/statemgr/migrate.go)
  preserves snapshot lineage/serial when both managers support migration metadata.
- [GCS client](https://github.com/opentofu/opentofu/blob/233700b795b6d2372f1c56ed57a4abaec9d36475/internal/backend/remote-state/gcs/client.go)
  creates locks conditionally and unlocks by generation. State upload itself is
  not a create-only destination precondition, so exclusive writers, destination
  verification and native locks remain essential.
