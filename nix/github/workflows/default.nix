{ pkgs, factory }:
let
  lib = pkgs.lib;
  workflow = name: builtins.readFile factory.github.workflows.${name}.configFile;
  infrastructure =
    name:
    builtins.toFile "${name}.yaml" (
      builtins.replaceStrings [ "group: factory-production" ] [ "group: site-production" ] (workflow name)
    );
  indent =
    prefix: text:
    lib.concatMapStringsSep "\n" (line: if line == "" then "" else prefix + line) (
      lib.splitString "\n" text
    );
  source = workflow "build";
  from = [
    "    inputs:\n"
    "group: factory-production"
    "      - name: Check out repository\n"
    "          persist-credentials: false\n"
    "      - name: Build\n"
  ];
  to = [
    (indent "    " ''
      inputs:
        app_sha:
          description: Reviewed 40-character public application commit
          required: true
          type: string
        check_run_id:
          description: Successful exact-source public Check run on main ancestry
          required: true
          type: string
        version:
          description: Reviewed application release version
          required: true
          type: string
    '')
    "group: source-release"
    "      - name: Check out trusted release tooling\n"
    (indent "          " ''
      ref: ''${{ github.sha }}
      path: tooling
      persist-credentials: false
    '')
    (indent "      " ''
      - name: Check out candidate source
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ''${{ inputs.app_sha }}
          path: source
          persist-credentials: false

      - name: Build
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
{
  plan.configFile = infrastructure "plan";
  apply.configFile = infrastructure "apply";
  build.configFile =
    assert lib.assertMsg (lib.all (
      text: lib.hasInfix text source
    ) from) "Source release Build template lost a patch point";
    builtins.toFile "build.yaml" (
      builtins.replaceStrings
        [ "    environment: prod\n" ]
        [ "    environment: prod\n    permissions:\n      contents: write\n      actions: read\n" ]
        (builtins.replaceStrings from to source)
    );
}
