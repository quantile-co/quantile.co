terraform {
  required_version = ">= 1.12.3, < 2.0.0"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "= 2.4.2"
    }
    google = {
      source  = "hashicorp/google"
      version = "8.7.0"
    }
    github = {
      source  = "integrations/github"
      version = "= 6.13.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "= 3.9.1"
    }
    restapi = {
      source  = "registry.terraform.io/Mastercard/restapi"
      version = "= 3.0.0"
    }
  }
}
