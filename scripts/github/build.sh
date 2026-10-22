#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?Use the job-scoped GitHub token}"
: "${APP_SHA:?Set the reviewed source commit}"
: "${CHECK_RUN_ID:?Set its successful Check run}"
: "${RELEASE_VERSION:?Set the reviewed version}"
: "${GITHUB_RUN_ID:?Set the publishing Build run}"
: "${GITHUB_STEP_SUMMARY:?Set the protected step summary}"
test "${GITHUB_REPOSITORY:?}" = quantile-co/quantile.co
export GH_REPO="$GITHUB_REPOSITORY"
[[ $APP_SHA =~ ^[0-9a-f]{40}$ && $CHECK_RUN_ID =~ ^[1-9][0-9]*$ && $GITHUB_RUN_ID =~ ^[1-9][0-9]*$ ]]
[[ $RELEASE_VERSION =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
[[ $# -eq 0 ]] || {
    echo 'Usage: scripts/github/build.sh' >&2
    exit 2
}
cd "${SOURCE_DIR:?Set the candidate source checkout}"
test "$(git rev-parse HEAD)" = "$APP_SHA"

checked=$(gh api "repos/$GH_REPO/actions/runs/$CHECK_RUN_ID")
jq -e --arg repo "$GH_REPO" --arg sha "$APP_SHA" '
    .repository.full_name == $repo and .head_repository.full_name == $repo and
    .path == ".github/workflows/check.yaml" and .event == "push" and
    .head_sha == $sha and .status == "completed" and .conclusion == "success"
' <<<"$checked" >/dev/null
attempt=$(jq -er '.run_attempt | numbers | select(. > 0 and . == floor)' <<<"$checked")
gh api "repos/$GH_REPO/actions/runs/$CHECK_RUN_ID/attempts/$attempt/jobs?per_page=100" |
    jq -e --arg sha "$APP_SHA" '
        any(.jobs[]; .name == "All" and .head_sha == $sha and
            .status == "completed" and .conclusion == "success")
    ' >/dev/null
gh api "repos/$GH_REPO/compare/$APP_SHA...main" |
    jq -e --arg sha "$APP_SHA" '
        (.status == "ahead" or .status == "identical") and .merge_base_commit.sha == $sha
    ' >/dev/null

# API failures are errors, not evidence that a tag or draft is absent.
tags=$(gh api "repos/$GH_REPO/git/matching-refs/tags/$RELEASE_VERSION")
releases=$(gh api --paginate --slurp "repos/$GH_REPO/releases?per_page=100")
if ! jq -e --arg ref "refs/tags/$RELEASE_VERSION" 'all(.[]; .ref != $ref)' <<<"$tags" >/dev/null ||
    ! jq -e --arg tag "$RELEASE_VERSION" 'all(.[][]; .tag_name != $tag)' <<<"$releases" >/dev/null; then
    echo 'Tag or release already exists; inspect it before any retry. Draft recovery is manual.' >&2
    exit 1
fi
test "$RELEASE_VERSION" = "v$(git show "$APP_SHA:package.json" | jq -er '.version')"
# GitHub's automatic archive contains only tracked files; never materialize or run candidate code here.
for name in tsconfig.json firebase.json firestore.rules next.config.ts postcss.config.cjs package.json pnpm-lock.yaml; do
    test "$(git cat-file -t "$APP_SHA:$name")" = blob
done

gh release create "$RELEASE_VERSION" --target "$APP_SHA" --title "$RELEASE_VERSION" \
    --generate-notes --latest=false --draft
id=$(gh release view "$RELEASE_VERSION" --json databaseId --jq .databaseId)
[[ $id =~ ^[1-9][0-9]*$ ]]
verify_release() {
    jq -e --arg tag "$RELEASE_VERSION" --arg sha "$APP_SHA" --argjson id "$id" --argjson draft "$1" '
        .id == $id and .name == $tag and .tag_name == $tag and .target_commitish == $sha and
        .draft == $draft and ($draft or .immutable == true) and .assets == []
    ' <<<"$release" >/dev/null
}
release=$(gh api "repos/$GH_REPO/releases/$id")
verify_release true
gh release edit "$RELEASE_VERSION" --draft=false
# Retry reads for eventual immutability visibility, never publication writes.
published=false
for _ in $(seq 1 12); do
    release=$(gh api "repos/$GH_REPO/releases/$id")
    if jq -e '.draft == false and .immutable == true' <<<"$release" >/dev/null; then
        published=true
        break
    fi
    sleep 5
done
test "$published" = true || {
    echo 'Immutability verification failed; inspect the release before proceeding.' >&2
    exit 1
}
verify_release false
gh api "repos/$GH_REPO/git/ref/tags/$RELEASE_VERSION" | jq -e --arg sha "$APP_SHA" '
    .object.type == "commit" and .object.sha == $sha
' >/dev/null
# shellcheck disable=SC2016
printf 'Published immutable release `%s` from Check `%s` (SHA `%s`). Use the automatic source archive from GitHub.\n' \
    "$RELEASE_VERSION" "$CHECK_RUN_ID" "$APP_SHA" >>"$GITHUB_STEP_SUMMARY"
