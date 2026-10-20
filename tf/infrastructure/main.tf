# trivy:ignore:AVD-GIT-0001
module "github" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/github?ref=67a955ddf9ad0a9a2fd335d7486b28d9f78a0243"

  repository_name = "quantile.co"
  description     = "Quantile marketing site."
  visibility      = "public"
  maintainers     = var.gh_maintainers
  required_checks = ["All / All"]
  environments    = ["prod"]
}

module "gcp" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/gcp?ref=67a955ddf9ad0a9a2fd335d7486b28d9f78a0243"

  project_prefix    = "quantile-co"
  folder_id         = var.gcp_folder_id
  billing_account   = var.gcp_billing_account
  tf_state_location = var.gcp_state_location
  wif_pool          = var.gcp_wif_pool
  maintainers       = var.gcp_maintainers

  repository_id             = module.github.repository_id
  repository_maintainer_ids = module.github.maintainer_ids
}
