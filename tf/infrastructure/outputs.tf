output "gh_repository_id" {
  description = "Immutable numeric GitHub repository ID."
  value       = module.github.repository_id
}

output "gcp_tf_state_bucket" {
  description = "GCS bucket containing this repository's OpenTofu state."
  value       = module.gcp.tf_state_bucket
}

output "gcp_tf_state_project_id" {
  description = "GCP project containing this repository's OpenTofu state."
  value       = module.gcp.tf_state_project_id
}
