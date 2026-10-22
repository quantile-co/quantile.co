{
  config,
  lib,
  pkgs,
  ...
}:
let
  replacements = [
    {
      from = ''
        on:
          workflow_dispatch:
      '';
      to = ''
        on:
          workflow_dispatch:
            inputs:
              app_sha:
                description: Reviewed 40-character public application commit
                required: true
                type: string
              check_run_id:
                description: Successful exact-source public Check run; source must be on main
                required: true
                type: string
              version:
                description: Reviewed application release version (for example v0.1.0)
                required: true
                type: string
      '';
    }
    {
      from = ''
        jobs:
          all:
            name: All
            if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'
            runs-on: namespace-profile-quantile-4x8
            timeout-minutes: 30
            steps:
              - name: Check out repository
                uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
                with:
                  persist-credentials: false
      '';
      to = ''
        jobs:
          build:
            name: Build
            if: >-
              github.ref == 'refs/heads/main' &&
              contains(fromJSON(vars.GH_MAINTAINERS), github.actor) &&
              contains(fromJSON(vars.GH_MAINTAINERS), github.triggering_actor)
            runs-on: namespace-profile-quantile-4x8
            concurrency:
              group: source-release
              cancel-in-progress: false
            timeout-minutes: 30
            permissions:
              actions: read
              contents: write
            steps:
              - name: Check out trusted release tooling
                uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
                with:
                  ref: ''${{ github.sha }}
                  path: tooling
                  persist-credentials: false

              - name: Check out candidate source
                uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
                with:
                  ref: ''${{ inputs.app_sha }}
                  path: source
                  persist-credentials: false
      '';
    }
    {
      from = "      - name: Build\n        run: nix run .#devenv-cli -- tasks run --show-output build:all\n";
      to = lib.concatStringsSep "\n" [
        "      - name: Publish reviewed source release"
        "        working-directory: tooling"
        "        env:"
        "          SECRETSPEC_PROFILE: default"
        "          SOURCE_DIR: \${{ github.workspace }}/source"
        "          APP_SHA: \${{ inputs.app_sha }}"
        "          CHECK_RUN_ID: \${{ inputs.check_run_id }}"
        "          RELEASE_VERSION: \${{ inputs.version }}"
        "          GH_TOKEN: \${{ github.token }}"
        "        run: nix run '.#devenv-cli' -- shell -- build-release \"$SOURCE_DIR\""
        ""
      ];
    }
  ];
  infrastructureReplacements = [
    {
      from = "group: factory-production";
      to = "group: site-production";
    }
    {
      from = "GCP_TF_STATE_BUCKET: \${{ vars.GCP_TF_STATE_BUCKET }}";
      to = "GCP_TF_STATE_BUCKET: \${{ vars.TF_STATE_BUCKET }}";
    }
    {
      from = "TF_VAR_gcp_folder_id: \${{ vars.GCP_FOLDER_ID }}";
      to = "TF_VAR_gcp_folder_id: \${{ vars.GCP_QUANTILE_CO_FOLDER_ID }}";
    }
  ];
  patchInfrastructure =
    file:
    let
      source = builtins.readFile file;
    in
    assert lib.assertMsg (lib.all (item: lib.hasInfix item.from source)
      infrastructureReplacements
    ) "Public site workflow template no longer contains its expected patch points";
    lib.replaceStrings (map (item: item.from) infrastructureReplacements) (map (
      item: item.to
    ) infrastructureReplacements) source;
  template = builtins.readFile config.quantile.github.workflows.build.configFile;
  workflow =
    assert lib.assertMsg (lib.all (
      item: lib.hasInfix item.from template
    ) replacements) "Public release Build template lost a patch point";
    lib.replaceStrings (map (item: item.from) replacements) (map (item: item.to) replacements) template;
  tools =
    (with config.quantile; [
      coreutils.package
      diffutils.package
      git.package
      gh.package
      jq.package
      nix.package
    ])
    ++ [
      pkgs.zip
      pkgs.unzip
    ];
  buildRelease = pkgs.writeShellApplication {
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
          any(.jobs[]; .name == "All" and .head_sha == $sha and
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

      test "$RELEASE_VERSION" = "v$(git show "$APP_SHA:package.json" | jq -er '.version')"
      source_dir="$PWD"
      work=$(mktemp -d "''${RUNNER_TEMP:?}/quantile-release.XXXXXXXX")
      checkout="$work/checkout"
      cleanup() {
        if [ -d "$checkout" ]; then git -C "$source_dir" worktree remove --force "$checkout"; fi
        rm -rf -- "$work"
      }
      trap cleanup EXIT
      git worktree add --detach "$checkout" "$APP_SHA" >&2
      mkdir "$work/home"
      (
        cd "$checkout"
        env -i HOME="$work/home" PATH="$PATH" CI=1 \
          NIX_CONFIG="''${NIX_CONFIG-}" NIX_SSL_CERT_FILE="''${NIX_SSL_CERT_FILE-}" \
          SSL_CERT_FILE="''${SSL_CERT_FILE-}" \
          nix run '.#devenv-cli' -- tasks run --show-output devenv:files
      )
      git archive --format=zip --output="$work/source.zip" "$APP_SHA"
      for name in tsconfig.json firebase.json firestore.rules; do
        file="$checkout/$name"
        if [ ! -f "$file" ] || [ -L "$file" ]; then
          echo "Missing regular generated release input: $name" >&2
          exit 1
        fi
        if git cat-file -e "$APP_SHA:$name" 2>/dev/null; then
          if ! git show "$APP_SHA:$name" | cmp -s - "$file"; then
            echo "Tracked release input differs from pinned Devenv generation: $name" >&2
            exit 1
          fi
        else
          touch -m -t 200001010000 "$file"
          (cd "$checkout" && TZ=UTC zip -q -X -j "$work/source.zip" "$name")
        fi
        unzip -p "$work/source.zip" "$name" | cmp -s - "$file" || {
          echo "Archive release input differs from generated file: $name" >&2
          exit 1
        }
      done
      unzip -p "$work/source.zip" firebase.json |
        jq -e '.firestore | (type == "object" and .rules == "firestore.rules")' > /dev/null
      cp -- "$checkout/firestore.rules" "$work/firestore.rules"
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
  };
in
{
  options.quantile.github.workflows.public = {
    build.package = lib.mkOption {
      type = lib.types.package;
      default = buildRelease;
      description = "Publish a reviewed source release.";
    };
    build.text = lib.mkOption {
      type = lib.types.str;
      default = workflow;
      description = "Protected source release workflow.";
    };
    plan.text = lib.mkOption {
      type = lib.types.str;
      default = patchInfrastructure config.quantile.github.workflows.plan.configFile;
      description = "Infrastructure Plan workflow.";
    };
    apply.text = lib.mkOption {
      type = lib.types.str;
      default = patchInfrastructure config.quantile.github.workflows.apply.configFile;
      description = "Infrastructure Apply workflow.";
    };
  };
}
