variable "gcp_wif_pool" {
  description = "Existing, trusted GitHub WIF pool resource path supplied by Q0."
  type        = string
  nullable    = false
}

variable "hindsight_api_token" {
  description = "Runtime Hindsight credential; excluded from saved plans and state."
  type        = string
  sensitive   = true
  ephemeral   = true
  nullable    = false

  validation {
    condition     = length(trimspace(var.hindsight_api_token)) > 0
    error_message = "Supply the protected Hindsight runtime credential."
  }
}
