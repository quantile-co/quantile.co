terraform {
  required_version = ">= 1.12"

  # Keep registry hosts explicit so Dependabot matches the OpenTofu lockfile.
  required_providers {
    google = {
      source  = "registry.opentofu.org/hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
    github = {
      source  = "registry.opentofu.org/integrations/github"
      version = ">= 6.0, < 7.0"
    }
    random = {
      source  = "registry.opentofu.org/hashicorp/random"
      version = ">= 3.0, < 4.0"
    }
  }
}
