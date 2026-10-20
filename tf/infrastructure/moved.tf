# Preserve existing objects in the same GCS bucket and repository/prod prefix.
moved {
  from = random_id.state
  to   = module.gcp.random_id.state
}

moved {
  from = google_project.state
  to   = module.gcp.google_project.state
}

moved {
  from = google_project_service.storage
  to   = module.gcp.google_project_service.storage
}

moved {
  from = google_project_iam_member.pipeline_owner
  to   = module.gcp.google_project_iam_member.pipeline_owner
}

moved {
  from = google_storage_bucket.state
  to   = module.gcp.google_storage_bucket.state
}

moved {
  from = github_repository.self
  to   = module.github.github_repository.self
}

moved {
  from = github_repository_vulnerability_alerts.self
  to   = module.github.github_repository_vulnerability_alerts.self
}

moved {
  from = github_repository_dependabot_security_updates.self
  to   = module.github.github_repository_dependabot_security_updates.self
}

moved {
  from = github_branch_protection.main
  to   = module.github.github_branch_protection.main
}

moved {
  from = github_repository_environment.prod
  to   = module.github.github_repository_environment.main["prod"]
}
