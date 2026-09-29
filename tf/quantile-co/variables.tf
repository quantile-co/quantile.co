variable "project_id" {
  description = "Existing GCP application project. Project creation and API enablement belong to the caller."
  type        = string
}

variable "project_number" {
  description = "Project number used in Cloud Run's deterministic service URLs."
  type        = string
}

variable "region" {
  description = "Cloud Run and Workflows region, selected by the caller."
  type        = string
}

variable "mode" {
  description = "Billing mode. The caller must bind a matching Stripe provider; never change an existing instance between test and live."
  type        = string
  validation {
    condition     = contains(["test", "live"], var.mode)
    error_message = "Mode must be test or live."
  }
}

variable "deployments" {
  description = "Namespaced deployments sharing this environment's catalog. Preserve every active deployment's reviewed image and YAML when updating another. Empty is catalog-only."
  type = map(object({
    image                    = string
    app_sha                  = string
    welcome_workflow_source  = string
    runtime_service_account  = string
    workflow_service_account = string
  }))
  default = {}

  validation {
    condition = alltrue([
      for namespace, deployment in var.deployments :
      can(regex("^(pr-[1-9][0-9]*|production)$", namespace)) &&
      can(regex("@sha256:[a-f0-9]{64}$", deployment.image)) &&
      can(regex("^[a-f0-9]{40}$", deployment.app_sha)) &&
      length(trimspace(deployment.welcome_workflow_source)) > 0
    ])
    error_message = "Use PR/production namespaces, immutable image digests, full application commit SHAs and reviewed workflow YAML."
  }
}

variable "welcome" {
  description = "Sender configuration and existing Secret Manager version resource names; never API key values. Required when deploying runtimes."
  type = object({
    from                  = string
    reply_to              = string
    stripe_secret_version = string
    resend_secret_version = string
  })
  default = null
  validation {
    condition = var.welcome == null ? true : alltrue([
      for version in [var.welcome.stripe_secret_version, var.welcome.resend_secret_version] :
      can(regex("^projects/[^/]+/secrets/[^/]+/versions/[^/]+$", version))
    ])
    error_message = "Supply Secret Manager version resource names, not secret contents."
  }
}

variable "alert_channels" {
  description = "Existing Cloud Monitoring notification-channel resource names; destinations are configured privately."
  type        = list(string)
  default     = []
}
