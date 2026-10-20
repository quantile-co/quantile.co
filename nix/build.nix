{
  config,
  lib,
  pkgs,
}:
let
  tools = with config.quantile; [
    coreutils.package
    git.package
    gh.package
    jq.package
  ];
in
pkgs.writeShellApplication {
  name = "build-release";
  runtimeInputs = tools;
  text = ''
    export PATH=${lib.escapeShellArg (lib.makeBinPath tools)}
    : "''${GH_TOKEN:?Use the job-scoped GitHub token}"
    : "''${APP_SHA:?Set the reviewed source commit}"
    : "''${CHECK_RUN_ID:?Set its successful Check run}"
    : "''${RELEASE_VERSION:?Set the reviewed version}"
    : "''${GITHUB_RUN_ID:?Set the publishing Build run}"
    test "''${GITHUB_REPOSITORY:?}" = quantile-co/quantile.co
    export GH_REPO="$GITHUB_REPOSITORY"
    [[ "$APP_SHA" =~ ^[0-9a-f]{40}$ && "$CHECK_RUN_ID" =~ ^[1-9][0-9]*$ && "$GITHUB_RUN_ID" =~ ^[1-9][0-9]*$ ]]
    [[ "$RELEASE_VERSION" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
    [ "$#" -eq 1 ] || { echo 'Usage: build-release <source-checkout>' >&2; exit 2; }
    cd "$1"
    test "$(git rev-parse HEAD)" = "$APP_SHA"

    checked=$(gh api "repos/$GH_REPO/actions/runs/$CHECK_RUN_ID")
    jq -e --arg repo "$GH_REPO" --arg sha "$APP_SHA" '
      .repository.full_name == $repo and .head_repository.full_name == $repo and
      .path == ".github/workflows/check.yaml" and .event == "push" and
      .head_sha == $sha and .status == "completed" and .conclusion == "success"
    ' <<< "$checked" > /dev/null
    attempt=$(jq -er '.run_attempt | numbers | select(. > 0 and . == floor)' <<< "$checked")
    gh api "repos/$GH_REPO/actions/runs/$CHECK_RUN_ID/attempts/$attempt/jobs?per_page=100" |
      jq -e --arg sha "$APP_SHA" '
        any(.jobs[]; .name == "All / All" and .head_sha == $sha and
          .status == "completed" and .conclusion == "success")
      ' > /dev/null
    gh api "repos/$GH_REPO/compare/$APP_SHA...main" |
      jq -e --arg sha "$APP_SHA" '
        (.status == "ahead" or .status == "identical") and .merge_base_commit.sha == $sha
      ' > /dev/null

    # API failures are errors, not evidence that a tag or draft is absent.
    tags=$(gh api "repos/$GH_REPO/git/matching-refs/tags/$RELEASE_VERSION")
    releases=$(gh api --paginate --slurp "repos/$GH_REPO/releases?per_page=100")
    if ! jq -e --arg ref "refs/tags/$RELEASE_VERSION" 'all(.[]; .ref != $ref)' <<< "$tags" > /dev/null ||
       ! jq -e --arg tag "$RELEASE_VERSION" 'all(.[][]; .tag_name != $tag)' <<< "$releases" > /dev/null; then
      echo 'Tag or release already exists; inspect it before any retry. Draft recovery is manual.' >&2
      exit 1
    fi

    # Read every packaged input from the checked commit, not working-tree edits.
    test "$RELEASE_VERSION" = "v$(git show "$APP_SHA:package.json" | jq -er '.version')"
    git show "$APP_SHA:firebase.json" |
      jq -e '.firestore | (type == "object" and .rules == "firestore.rules")' > /dev/null
    work=$(mktemp -d "''${RUNNER_TEMP:?}/quantile-release.XXXXXXXX")
    trap 'rm -rf -- "$work"' EXIT
    git archive --format=zip --output="$work/source.zip" "$APP_SHA"
    git show "$APP_SHA:firestore.rules" > "$work/firestore.rules"
    test -s "$work/firestore.rules"
    digest() { sha256sum "$1" | cut -d' ' -f1; }
    jq -n --arg version "$RELEASE_VERSION" --arg sha "$APP_SHA" \
      --arg check "$CHECK_RUN_ID" --arg build "$GITHUB_RUN_ID" \
      --arg source "$(digest "$work/source.zip")" --arg rules "$(digest "$work/firestore.rules")" '
      {schema_version: 1, version: $version, app_sha: $sha, check_run_id: $check,
        build_run_id: $build, source_sha256: $source, rules_sha256: $rules}
    ' > "$work/release.json"
    gh api --method POST "repos/$GH_REPO/releases/generate-notes" \
      -f "tag_name=$RELEASE_VERSION" -f "target_commitish=$APP_SHA" --jq .body > "$work/notes.md"
    # shellcheck disable=SC2016
    printf '\n\n### Build provenance\n\n- [Source commit](https://github.com/%s/commit/%s)\n- [Check](https://github.com/%s/actions/runs/%s)\n- [Build](https://github.com/%s/actions/runs/%s)\n\nReviewed source and client Rules are attached. Provenance and checksums are in `release.json`.\n' \
      "$GH_REPO" "$APP_SHA" "$GH_REPO" "$CHECK_RUN_ID" "$GH_REPO" "$GITHUB_RUN_ID" >> "$work/notes.md"
    gh release create "$RELEASE_VERSION" \
      "$work/source.zip#source.zip" "$work/firestore.rules#firestore.rules" "$work/release.json#release.json" \
      --target "$APP_SHA" --title "$RELEASE_VERSION" --notes-file "$work/notes.md" --latest=false --draft
    id=$(gh release view "$RELEASE_VERSION" --json databaseId --jq .databaseId)
    [[ "$id" =~ ^[1-9][0-9]*$ ]]

    verify_release() {
      jq -e --arg tag "$RELEASE_VERSION" --arg sha "$APP_SHA" --argjson id "$id" --argjson draft "$1" '
        .id == $id and .name == $tag and .tag_name == $tag and .target_commitish == $sha and
        .draft == $draft and ($draft or .immutable == true) and
        ([.assets[].name] | sort) == ["firestore.rules", "release.json", "source.zip"]
      ' <<< "$release" > /dev/null
      for name in source.zip firestore.rules release.json; do
        actual=$(jq -er --arg name "$name" '.assets[] | select(.name == $name) | .digest' <<< "$release")
        test "$actual" = "sha256:$(digest "$work/$name")"
      done
    }
    release=$(gh api "repos/$GH_REPO/releases/$id")
    verify_release true
    gh release edit "$RELEASE_VERSION" --draft=false
    # Immutability can become visible after publication; retry reads, never writes.
    published=false
    for _ in $(seq 1 12); do
      release=$(gh api "repos/$GH_REPO/releases/$id")
      if jq -e '.draft == false and .immutable == true' <<< "$release" > /dev/null; then
        published=true
        break
      fi
      sleep 5
    done
    test "$published" = true || { echo 'Immutability verification failed; inspect the release before proceeding.' >&2; exit 1; }
    verify_release false
    gh api "repos/$GH_REPO/git/ref/tags/$RELEASE_VERSION" | jq -e --arg sha "$APP_SHA" '
      .object.type == "commit" and .object.sha == $sha
    ' > /dev/null
    gh release download "$RELEASE_VERSION" --dir "$work/download"
    for name in source.zip firestore.rules release.json; do
      test "$(digest "$work/download/$name")" = "$(digest "$work/$name")"
    done
    asset_id=$(jq -er '.assets[] | select(.name == "source.zip") | .id' <<< "$release")
    # shellcheck disable=SC2016
    printf 'Published immutable source release `%s` from Check `%s` (SHA `%s`). Source asset ID `%s`, SHA256 `%s`.\n' \
      "$RELEASE_VERSION" "$CHECK_RUN_ID" "$APP_SHA" "$asset_id" "$(digest "$work/source.zip")" >> "''${GITHUB_STEP_SUMMARY:?}"
  '';
}
