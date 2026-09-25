variable "github_quantile_co_organization" {
  description = "GitHub organization containing this repository."
  type        = string
  default     = "quantile-co"
}

variable "github_quantile_co_token" {
  description = "Fine-grained PAT for this repository."
  type        = string
  sensitive   = true
}

variable "github_maintainers" {
  description = "GitHub usernames trusted to merge and deploy this repository."
  type        = list(string)
  default     = ["aj-welch"]

  validation {
    condition     = length(var.github_maintainers) > 0
    error_message = "At least one maintainer is required."
  }
}
