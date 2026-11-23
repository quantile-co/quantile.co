# Runtime credentials use GITHUB_TOKEN, REST_API_BEARER, WIF ADC and an ephemeral Hindsight input.
provider "restful" {
  alias    = "hindsight"
  base_url = "https://api.hindsight.vectorize.io"
  security = { http = { token = { token = var.hindsight_api_token } } }
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
