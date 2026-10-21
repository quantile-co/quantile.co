# trivy:ignore:AVD-GIT-0001
module "github" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/github?ref=d500b2ce146347a5749d55ab4b40b66733002424"

  repository_name = "quantile.co"
  description     = "Quantile marketing site."
  visibility      = "public"
  maintainers     = var.gh_maintainers
  required_checks = ["All / All"]
  environments    = ["prod"]
}

module "gcp" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/gcp?ref=d500b2ce146347a5749d55ab4b40b66733002424"

  project_prefix    = "quantile-co"
  folder_id         = var.gcp_folder_id
  billing_account   = var.gcp_billing_account
  tf_state_location = var.gcp_state_location
  wif_pool          = var.gcp_wif_pool
  maintainers       = var.gcp_maintainers

  repository_id             = module.github.repository_id
  repository_maintainer_ids = module.github.maintainer_ids
}
