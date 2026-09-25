output "repository_id" {
  description = "Immutable numeric GitHub repository ID."
  value       = github_repository.self.repo_id
}

output "state_project_id" {
  description = "GCP project containing this repository's OpenTofu state."
  value       = google_project.state.project_id
}

output "state_bucket" {
  description = "GCS bucket containing this repository's OpenTofu state."
  value       = google_storage_bucket.state.name
}
