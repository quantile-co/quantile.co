# Release immutability belongs to this application's publication contract.
# Removing this marker never disables the remote setting.
resource "terraform_data" "immutable_releases" {
  input = module.gh.repo_name

  provisioner "local-exec" {
    command = <<-EOT
      set -eu
      export GH_TOKEN="$GITHUB_TOKEN"
      gh api --method PUT "repos/quantile-co/${self.input}/immutable-releases"
      for attempt in $(seq 1 12); do
        if [ "$(gh api -H 'Cache-Control: no-cache' "repos/quantile-co/${self.input}/immutable-releases" --jq '.enabled')" = true ]; then
          exit 0
        fi
        sleep 5
      done
      echo 'GitHub release immutability was not readable as enabled after the API update.' >&2
      exit 1
    EOT
  }
}

# The postcondition enforces a remote invariant without a downstream consumer.
# tflint-ignore: terraform_unused_declarations
data "external" "immutable_releases" {
  depends_on = [terraform_data.immutable_releases]

  # Apply also supplies GH_TOKEN for artifact reads. Use the provider credential
  # for this repository-administration API without placing its value in state.
  program = [
    "bash", "-c",
    "export GH_TOKEN=\"$GITHUB_TOKEN\"; exec gh api \"repos/quantile-co/$1/immutable-releases\" --jq '{enabled: (.enabled | tostring)}'",
    "immutable-releases", module.gh.repo_name,
  ]

  lifecycle {
    postcondition {
      condition     = self.result.enabled == "true"
      error_message = "GitHub release immutability is disabled; review and restore it before continuing."
    }
  }
}
