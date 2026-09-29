terraform {
  required_version = ">= 1.12"

  required_providers {
    google-beta = {
      source  = "registry.opentofu.org/hashicorp/google-beta"
      version = ">= 8.0, < 9.0"
    }
    stripe = {
      source  = "registry.terraform.io/stripe/stripe"
      version = "= 0.3.0"
    }
  }
}
