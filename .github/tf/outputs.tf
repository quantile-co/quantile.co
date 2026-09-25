output "repository_id" {
  description = "Immutable numeric GitHub repository ID."
  value       = github_repository.self.repo_id
}
