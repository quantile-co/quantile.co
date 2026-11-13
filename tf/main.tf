locals {
  project_owners  = [{ gcp_email = "aj@quantile.co", gh_username = "aj-welch" }]
  project_members = []
}

module "hindsight" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/hindsight?ref=7d3121912d8a28a9ab85c7005f3ab7ff4ef9e481"

  providers = {
    restapi = restapi.hindsight
  }

  bank_id = "quantile-co--quantile-co"
  name    = "quantile-co/quantile.co"
}

# trivy:ignore:AVD-GIT-0001
module "gh" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/github?ref=a2205ee819a322ff03d4ff6de93120ec80165f79"

  allowed_action_patterns = [
    "quantile-co/factory/.github/workflows/*@*",
    "cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24",
    "cachix/cachix-action@38b082610b782e7e93e209c35fd730d399dee866",
    "namespacelabs/nscloud-cache-action@1124a6f3ce44e5cf84cc22111530961f4d2a15f9",
    "cachix/install-nix-action@448cde739abec1eaf0646249e3d25bb8d9bc7702",
    "cachix/install-nix-action@75c75c31ebece974e48ebc36b4ad125bd97bd97b",
  ]

  repo_name       = "quantile.co"
  description     = "Quantile marketing site."
  visibility      = "public"
  owners          = [for person in local.project_owners : person.gh_username]
  members         = [for person in local.project_members : person.gh_username]
  required_checks = ["All"]
  environments    = ["prod"]
}

module "gcp" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/gcp?ref=2826c590904defc48baf3f34df81218420da18b7"

  project_prefix    = "quantile-co"
  folder_id         = "145094075590"
  billing_account   = "0120D4-52D1E2-9C3D0D"
  tf_state_location = "US"
  wif_pool          = var.gcp_wif_pool
  owners            = [for person in local.project_owners : person.gcp_email]
  members           = [for person in local.project_members : person.gcp_email]

  gh_repo_id   = module.gh.repo_id
  gh_owner_ids = module.gh.owner_ids
}

# Release immutability belongs to this application's publication contract.
# Removing this marker never disables the remote setting.
resource "terraform_data" "immutable_releases" {
  input = module.gh.repo_name

  provisioner "local-exec" {
    command = <<-EOT
      set -eu
      export GH_TOKEN="$GITHUB_TOKEN"
      gh api --method PUT "repos/quantile-co/${self.input}/immutable-releases"
      for attempt in $(seq 1 12); do
        if [ "$(gh api -H 'Cache-Control: no-cache' "repos/quantile-co/${self.input}/immutable-releases" --jq '.enabled')" = true ]; then
          exit 0
        fi
        sleep 5
      done
      echo 'GitHub release immutability was not readable as enabled after the API update.' >&2
      exit 1
    EOT
  }
}

# The postcondition enforces a remote invariant without a downstream consumer.
# tflint-ignore: terraform_unused_declarations
data "external" "immutable_releases" {
  depends_on = [terraform_data.immutable_releases]

  # Apply also supplies GH_TOKEN for artifact reads. Use the provider credential
  # for this repository-administration API without placing its value in state.
  program = [
    "bash", "-c",
    "export GH_TOKEN=\"$GITHUB_TOKEN\"; exec gh api \"repos/quantile-co/$1/immutable-releases\" --jq '{enabled: (.enabled | tostring)}'",
    "immutable-releases", module.gh.repo_name,
  ]

  lifecycle {
    postcondition {
      condition     = self.result.enabled == "true"
      error_message = "GitHub release immutability is disabled; review and restore it before continuing."
    }
  }
}
