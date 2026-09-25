variable "gcp_billing_account" {
  description = "GCP billing account ID."
  type        = string
}

variable "gcp_quantile_co_folder_id" {
  description = "GCP quantile-co folder ID for public repository support projects."
  type        = string
}

variable "gcp_state_location" {
  description = "Location for the OpenTofu state bucket."
  type        = string
  default     = "US"
}

variable "gcp_wif_pool" {
  description = "Full GitHub workload identity pool resource path."
  type        = string
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

variable "github_quantile_co_organization" {
  description = "GitHub organization containing this repository."
  type        = string
  default     = "quantile-co"
}

variable "github_quantile_co_token" {
  description = "Fine-grained PAT targeting quantile-co."
  type        = string
  sensitive   = true
}
