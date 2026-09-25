# ==============================================================================
# GCP — repository state project
# ==============================================================================
resource "random_id" "state" {
  byte_length = 2
}

resource "google_project" "state" {
  name                = "quantile-co-${random_id.state.hex}"
  project_id          = "quantile-co-${random_id.state.hex}"
  folder_id           = var.gcp_co_folder_id
  billing_account     = var.gcp_billing_account
  auto_create_network = false
  deletion_policy     = "PREVENT"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "storage" {
  project            = google_project.state.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

locals {
  github_wif_pool = "principalSet://iam.googleapis.com/${var.gcp_wif_pool}"
  github_pipeline_owners = {
    for username, maintainer in data.github_user.maintainer :
    username => "${local.github_wif_pool}/attribute.main_branch_repository_actor_id/${github_repository.self.repo_id}_${maintainer.id}"
  }
}

resource "google_project_iam_member" "pipeline_owner" {
  for_each = local.github_pipeline_owners

  project = google_project.state.project_id
  role    = "roles/owner"
  member  = each.value
}

resource "google_storage_bucket" "state" {
  depends_on = [google_project_service.storage]

  project                     = google_project.state.project_id
  name                        = "${google_project.state.project_id}-tf-state"
  location                    = var.gcp_state_location
  force_destroy               = false
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      days_since_noncurrent_time = 90
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ==============================================================================
# GitHub — repository
# ==============================================================================
resource "github_repository" "self" {
  provider = github.co

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
  provider = github.co

  repository = github_repository.self.name
  enabled    = true
}

resource "github_repository_dependabot_security_updates" "self" {
  provider   = github.co
  depends_on = [github_repository_vulnerability_alerts.self]

  repository = github_repository.self.name
  enabled    = true
}

data "github_user" "maintainer" {
  provider = github.co
  for_each = toset(var.github_maintainers)

  username = each.value
}

resource "github_branch_protection" "main" {
  provider = github.co

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
  provider = github.co

  repository  = github_repository.self.name
  environment = "prod"

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_actions_variable" "context" {
  provider = github.co
  for_each = {
    GCP_BILLING_ACCOUNT = var.gcp_billing_account
    GCP_CO_FOLDER_ID    = var.gcp_co_folder_id
    GCP_PROJECT_ID      = google_project.state.project_id
    GCP_WIF_POOL        = var.gcp_wif_pool
    GCP_WIF_PROVIDER    = var.gcp_wif_provider
    GH_MAINTAINERS      = jsonencode(var.github_maintainers)
    TF_STATE_BUCKET     = google_storage_bucket.state.name
  }

  repository    = github_repository.self.name
  variable_name = each.key
  value         = each.value
}
