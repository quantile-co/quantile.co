{ config, lib, ... }:
let
  replacements = [
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
  patch =
    file:
    let
      source = builtins.readFile file;
    in
    assert lib.assertMsg (lib.all (
      item: lib.hasInfix item.from source
    ) replacements) "Public site workflow template no longer contains its expected patch points";
    lib.replaceStrings (map (item: item.from) replacements) (map (item: item.to) replacements) source;
in
{
  packages = [
    config.quantile.github.workflows.plan.package
    config.quantile.github.workflows.apply.package
  ];

  files = {
    ".github/workflows/check.yaml" = {
      source = config.quantile.github.workflows.check.configFile;
      copyMode = "copy";
    };
    ".github/workflows/test.yaml" = {
      source = config.quantile.github.workflows.test.configFile;
      copyMode = "copy";
    };
    ".github/workflows/plan.yaml" = {
      text = patch config.quantile.github.workflows.plan.configFile;
      copyMode = "copy";
    };
    ".github/workflows/apply.yaml" = {
      text = patch config.quantile.github.workflows.apply.configFile;
      copyMode = "copy";
    };
  };
}
