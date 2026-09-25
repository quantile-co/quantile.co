resource "github_repository" "self" {
  provider = github.quantile_co

  name        = "quantile.co"
  description = "Quantile marketing site."
  visibility  = "public"

  has_issues      = true
  has_discussions = false
  has_projects    = false
  has_wiki        = false

  allow_merge_commit     = true
  allow_squash_merge     = true
  allow_rebase_merge     = false
  delete_branch_on_merge = true

  archive_on_destroy = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_repository_vulnerability_alerts" "self" {
  provider = github.quantile_co

  repository = github_repository.self.name
  enabled    = true
}

resource "github_repository_dependabot_security_updates" "self" {
  provider   = github.quantile_co
  depends_on = [github_repository_vulnerability_alerts.self]

  repository = github_repository.self.name
  enabled    = true
}

data "github_user" "maintainer" {
  provider = github.quantile_co
  for_each = toset(var.github_maintainers)

  username = each.value
}

resource "github_branch_protection" "main" {
  provider = github.quantile_co

  repository_id  = github_repository.self.node_id
  pattern        = "main"
  enforce_admins = true

  allows_deletions    = false
  allows_force_pushes = false

  required_status_checks {
    strict   = true
    contexts = ["Checks", "OpenTofu"]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = length(var.github_maintainers) > 1
    require_last_push_approval      = length(var.github_maintainers) > 1
    required_approving_review_count = length(var.github_maintainers) > 1 ? 1 : 0
  }

  restrict_pushes {
    push_allowances = [for maintainer in data.github_user.maintainer : maintainer.node_id]
  }
}

resource "github_repository_environment" "prod" {
  provider = github.quantile_co

  repository  = github_repository.self.name
  environment = "prod"

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
