# Runtime credentials use GITHUB_TOKEN, REST_API_BEARER, WIF ADC and an ephemeral Hindsight input.
provider "restapi" {
  alias        = "hindsight"
  uri          = "https://api.hindsight.vectorize.io"
  bearer_token = var.hindsight_api_token
}

provider "google" {}

provider "github" {
  owner = "quantile-co"
}

provider "restapi" {
  uri = "https://api.github.com"

  headers = {
    Accept               = "application/vnd.github+json"
    X-GitHub-Api-Version = "2022-11-28"
  }
}
