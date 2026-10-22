# trivy:ignore:AVD-GIT-0001
module "github" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/github?ref=2e0f3f9ba9a437fcfce74fcdb50f21304c56d0ba"

  repository_name = "quantile.co"
  description     = "Quantile marketing site."
  visibility      = "public"
  maintainers     = var.gh_maintainers
  required_checks = ["All"]
  environments    = ["prod"]
}

module "gcp" {
  source = "git::https://github.com/quantile-co/factory.git//tf/modules/project/gcp?ref=a1652e1872e10152cd2784d51bf3913dce787ff1"

  project_prefix    = "quantile-co"
  folder_id         = var.gcp_folder_id
  billing_account   = var.gcp_billing_account
  tf_state_location = var.gcp_state_location
  wif_pool          = var.gcp_wif_pool
  maintainers       = var.gcp_maintainers

  repository_id             = module.github.repository_id
  repository_maintainer_ids = module.github.maintainer_ids
}
