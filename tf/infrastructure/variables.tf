variable "gcp_billing_account" {
  description = "GCP billing account ID."
  type        = string
}

variable "gcp_folder_id" {
  description = "GCP folder containing this repository's state project."
  type        = string
}

variable "gcp_maintainers" {
  description = "Google account emails allowed to read saved plans, not state."
  type        = set(string)
}

variable "gcp_state_location" {
  description = "Existing location of the protected state bucket."
  type        = string
  default     = "US"
}

variable "gcp_wif_pool" {
  description = "Full GitHub workload identity pool resource path."
  type        = string
}

variable "gh_maintainers" {
  description = "GitHub maintainer usernames for protected workflow access."
  type        = set(string)

  validation {
    condition     = length(var.gh_maintainers) > 0
    error_message = "At least one maintainer is required."
  }
}
