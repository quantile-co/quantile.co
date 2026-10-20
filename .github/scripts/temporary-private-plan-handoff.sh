#!/usr/bin/env bash
# Temporary first-plan handoff, removed after the reviewed access-grant Apply.
set -euo pipefail
set +x
umask 077

# Keep operation dependencies in the declared shell, without runner PATH fallback.
IFS=: read -r -a paths <<< "$PATH"
pinned_path=
for path in "${paths[@]}"; do
    case "$path" in
        /nix/store/*) pinned_path="${pinned_path:+$pinned_path:}$path" ;;
    esac
done
export PATH="$pinned_path"

: "${GH_TOKEN:?Use only the job-scoped GitHub token}"
: "${GCP_TF_STATE_BUCKET:?Set the existing state bucket}"
: "${GITHUB_REPOSITORY:?Expected a GitHub Actions run}"
: "${GITHUB_REPOSITORY_ID:?Expected a repository ID}"
: "${GITHUB_SHA:?Expected the checked-out revision}"
: "${RUNNER_TEMP:?Keep plans outside the checkout}"
test "${TF_BACKEND_PREFIX:?Set the backend prefix}" = repository/prod
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"

for id in "${PLAN_RUN_ID:?}" "${PLAN_ATTEMPT:?}"; do
    [[ "$id" =~ ^[1-9][0-9]*$ ]] || {
        echo 'Use numeric Plan run and attempt IDs.' >&2
        exit 1
    }
done
test "$PLAN_RUN_ID" = "${GITHUB_RUN_ID:?Only hand off this workflow run}"
test "$PLAN_ATTEMPT" = "${GITHUB_RUN_ATTEMPT:?Only hand off this attempt}"
# The successful called Plan published this one receipt in the same workflow run.
# GitHub artifact indexing can lag a completed upload briefly.
for ((retry = 1; retry <= 5; retry++)); do
    PLAN_ARTIFACT_ID=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$PLAN_RUN_ID/artifacts?per_page=100" |
        jq -r --arg name "plan-$PLAN_RUN_ID-$PLAN_ATTEMPT" \
            '[.artifacts[] | select(.name == $name)] | if length == 1 then .[0].id else empty end')
    if [[ "$PLAN_ARTIFACT_ID" =~ ^[1-9][0-9]*$ ]]; then break; fi
    sleep 10
done
[[ "$PLAN_ARTIFACT_ID" =~ ^[1-9][0-9]*$ ]] || {
    echo 'The exact Plan receipt artifact was not found.' >&2
    exit 1
}
recipient=$(< .github/plan-review.agepub)
[[ "$recipient" =~ ^age1[0-9a-z]{58}$ ]] || {
    echo 'Invalid reviewed public plan recipient.' >&2
    exit 1
}

audit=$(mktemp -d -p "$RUNNER_TEMP")
encrypted="$RUNNER_TEMP/encrypted-plan"
test ! -e "$encrypted"
mkdir -m 0700 -- "$encrypted"
cleanup() {
    result=$?
    rm -rf -- "$audit"
    if [ "$result" -ne 0 ]; then rm -rf -- "$encrypted"; fi
}
trap cleanup EXIT

# Bind the ciphertext to the same producer and receipt that Apply will verify.
gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$PLAN_ARTIFACT_ID" > "$audit/artifact.json"
jq -e --arg id "$PLAN_ARTIFACT_ID" --arg repo "$GITHUB_REPOSITORY_ID" \
    --arg sha "$GITHUB_SHA" --arg name "plan-$PLAN_RUN_ID-$PLAN_ATTEMPT" '
    .id == ($id | tonumber) and .name == $name and .expired == false and
    .workflow_run.repository_id == ($repo | tonumber) and
    .workflow_run.head_sha == $sha and
    (.created_at | fromdateiso8601) <= now and
    (.created_at | fromdateiso8601) > now - 86400 and
    (.expires_at | fromdateiso8601) > now and
    (.digest | test("^sha256:[a-f0-9]{64}$"))
' "$audit/artifact.json" > /dev/null
test "$(jq -r '.workflow_run.id' "$audit/artifact.json")" = "$PLAN_RUN_ID"
gh api "repos/$GITHUB_REPOSITORY/actions/runs/$PLAN_RUN_ID/attempts/$PLAN_ATTEMPT" > "$audit/run.json"
jq -e --arg run "$PLAN_RUN_ID" --arg attempt "$PLAN_ATTEMPT" \
    --arg repo "$GITHUB_REPOSITORY" --arg repo_id "$GITHUB_REPOSITORY_ID" \
    --arg sha "$GITHUB_SHA" '
    .id == ($run | tonumber) and .run_attempt == ($attempt | tonumber) and
    .repository.full_name == $repo and .repository.id == ($repo_id | tonumber) and
    .head_sha == $sha and .path == ".github/workflows/plan.yaml" and
    .event == "workflow_dispatch" and .head_branch == "main" and
    .status == "in_progress" and .conclusion == null
' "$audit/run.json" > /dev/null
# This job is part of the producer run, which cannot complete until handoff ends.
# Require the called Plan JOB to have succeeded; Apply still requires the entire
# original run to complete successfully before it will consume this receipt.
gh api "repos/$GITHUB_REPOSITORY/actions/runs/$PLAN_RUN_ID/attempts/$PLAN_ATTEMPT/jobs?per_page=100" > "$audit/jobs.json"
jq -e '[.jobs[] | select(.name == "Infrastructure / Infrastructure")] |
    length == 1 and .[0].status == "completed" and .[0].conclusion == "success"
' "$audit/jobs.json" > /dev/null
test "$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq .object.sha)" = "$GITHUB_SHA"

gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$PLAN_ARTIFACT_ID/zip" > "$audit/artifact.zip"
zip_digest=$(jq -r '.digest | ltrimstr("sha256:")' "$audit/artifact.json")
printf '%s  %s\n' "$zip_digest" "$audit/artifact.zip" | sha256sum --check --status
python3 - "$audit/artifact.zip" "$audit/receipt.json" <<'PY'
import pathlib
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    entries = archive.infolist()
    if len(entries) != 1 or entries[0].filename != "plan.json" or entries[0].file_size > 65536:
        raise SystemExit("Unexpected receipt archive contents.")
    pathlib.Path(sys.argv[2]).write_bytes(archive.read(entries[0]))
PY
backend=$(printf '%s\n%s\n' "$GCP_TF_STATE_BUCKET" "$TF_BACKEND_PREFIX" | sha256sum | cut -d ' ' -f1)
jq -e --arg backend "$backend" '
    .schema == 1 and .storage == "gcs" and .backend == $backend and
    (.sha256 | test("^[a-f0-9]{64}$")) and
    (.generation | test("^[1-9][0-9]*$"))
' "$audit/receipt.json" > /dev/null

# The producer's bucket is private; never emit its metadata or plan in logs.
gcloud storage buckets describe "gs://$GCP_TF_STATE_BUCKET" --raw --format=json \
    > "$audit/bucket.json" 2> "$audit/bucket.err" || {
    echo 'Could not verify the private saved-plan bucket.' >&2
    exit 1
}
jq -e '.iamConfiguration.publicAccessPrevention == "enforced" and
    .iamConfiguration.uniformBucketLevelAccess.enabled == true' \
    "$audit/bucket.json" > /dev/null
generation=$(jq -r .generation "$audit/receipt.json")
object="gs://$GCP_TF_STATE_BUCKET/plans/$GITHUB_REPOSITORY_ID/$PLAN_RUN_ID/$PLAN_ATTEMPT/plan.tfplan#$generation"
gcloud storage cp "$object" "$audit/plan.tfplan" --quiet > "$audit/copy.log" 2>&1 || {
    echo 'Could not retrieve the saved plan at its pinned generation.' >&2
    exit 1
}
plan_digest=$(jq -r .sha256 "$audit/receipt.json")
printf '%s  %s\n' "$plan_digest" "$audit/plan.tfplan" | sha256sum --check --status
age -r "$recipient" -o "$encrypted/plan.tfplan.age" "$audit/plan.tfplan"
echo 'A verified saved plan was encrypted for the reviewed recipient; no plaintext was uploaded.'
