# Runtime credentials come from GITHUB_TOKEN, REST_API_BEARER and WIF ADC.
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
