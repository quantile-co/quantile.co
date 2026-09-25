terraform {
  required_version = ">= 1.12"

  # Keep registry hosts explicit so Dependabot matches the OpenTofu lockfile.
  required_providers {
    github = {
      source  = "registry.opentofu.org/integrations/github"
      version = ">= 6.0, < 7.0"
    }
  }
}
