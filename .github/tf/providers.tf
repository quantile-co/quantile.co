provider "google" {}

provider "github" {
  alias = "co"
  owner = var.github_quantile_co_organization
  token = var.github_quantile_co_token
}
