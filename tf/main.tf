locals {
  project_owners  = [{ gcp_email = "aj@quantile.co", gh_username = "aj-welch" }]
  project_members = []
}

# trivy:ignore:AVD-GIT-0001
module "gh" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/github?ref=8f966fb1d6062a52754a3d47b9f2791a617e2849"

  repo_name       = "quantile.co"
  description     = "Quantile marketing site."
  visibility      = "public"
  owners          = [for person in local.project_owners : person.gh_username]
  members         = [for person in local.project_members : person.gh_username]
  required_checks = ["All"]
  environments    = ["prod"]
}

module "gcp" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/gcp?ref=8f966fb1d6062a52754a3d47b9f2791a617e2849"

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
