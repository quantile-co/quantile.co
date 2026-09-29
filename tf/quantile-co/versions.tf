terraform {
  required_version = ">= 1.12"

  required_providers {
    stripe = {
      source  = "registry.terraform.io/stripe/stripe"
      version = "= 0.3.0"
    }
  }
}
