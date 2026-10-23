{ pkgs, factory }:
let
  # Preserve the existing production concurrency group.
  infrastructureWorkflow =
    name:
    let
      source = builtins.readFile factory.github.workflows.${name}.configFile;
      from = [ "group: factory-production" ];
      to = [ "group: site-production" ];
    in
    assert pkgs.lib.assertMsg (pkgs.lib.all (
      text: pkgs.lib.hasInfix text source
    ) from) "Site workflow template no longer contains its expected patch points";
    pkgs.writeText "${name}.yaml" (builtins.replaceStrings from to source);
  # Preserve YAML nesting when inserting multiline release-only steps.
  indent =
    prefix: text:
    pkgs.lib.concatMapStringsSep "\n" (line: if line == "" then "" else prefix + line) (
      pkgs.lib.splitString "\n" text
    );
  # Build publishes only the reviewed tag/release; GitHub supplies the source archive.
  buildWorkflow = pkgs.writeText "build.yaml" (
    let
      source = builtins.readFile factory.github.workflows.build.configFile;
      from = [
        "  workflow_dispatch:\n"
        "    name: All\n    if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'\n"
        "      - name: Check out repository\n"
        "          persist-credentials: false\n"
        "      - name: Build\n"
      ];
      to = [
        (indent "  " ''
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
        '')
        (indent "    " ''
          name: Build
          if: >-
            github.event_name == 'workflow_dispatch' &&
            github.ref == 'refs/heads/main' &&
            contains(fromJSON(vars.PROJECT_OWNERS || '[]').*.gh_username, github.actor) &&
            contains(fromJSON(vars.PROJECT_OWNERS || '[]').*.gh_username, github.triggering_actor)
          concurrency:
            group: source-release
            cancel-in-progress: false
          permissions:
            actions: read
            contents: write
        '')
        "      - name: Check out trusted release tooling\n"
        (indent "      " ''
              ref: ''${{ github.sha }}
              path: tooling
              persist-credentials: false

          - name: Check out candidate source
            uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
            with:
              ref: ''${{ inputs.app_sha }}
              path: source
              persist-credentials: false
        '')
        (indent "      " ''
          - name: Publish reviewed source release
            working-directory: tooling
            env:
              SOURCE_DIR: ''${{ github.workspace }}/source
              APP_SHA: ''${{ inputs.app_sha }}
              CHECK_RUN_ID: ''${{ inputs.check_run_id }}
              RELEASE_VERSION: ''${{ inputs.version }}
              GH_TOKEN: ''${{ github.token }}
        '')
      ];
    in
    assert pkgs.lib.assertMsg (pkgs.lib.all (
      text: pkgs.lib.hasInfix text source
    ) from) "Source release Build template lost a patch point";
    builtins.replaceStrings from to source
  );
in
{
  build.configFile = buildWorkflow;
  plan.configFile = infrastructureWorkflow "plan";
  apply.configFile = infrastructureWorkflow "apply";
}
