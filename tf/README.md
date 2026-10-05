## Day 0 Runbook

```sh
set -euo pipefail
# One-time bootstrap for quantile-co/quantile.co. First confirm this root has
# NO existing local or remote state or support project. If it does, stop: use
# that state and import/reconcile existing objects instead of creating another.
# The quantile-q0/q0 operator supplies the folder ID, WIF pool/provider and
# billing account; use an authorized GitHub repo PAT and GCP ADC.
gcloud auth application-default login
# Export these from q0's outputs and authorized operator settings before running.
: "${TF_VAR_gcp_billing_account:?set the billing account}"
: "${TF_VAR_gcp_quantile_co_folder_id:?set q0 quantile_co_folder_id}"
: "${TF_VAR_gcp_wif_pool:?set q0 github_wif_pool}"
: "${GCP_WIF_PROVIDER:?set q0 github_quantile_co_wif_provider}"
: "${TF_VAR_github_maintainers:?set a JSON array of maintainer usernames}"
# Supply this from a secure local source, never as a literal shell command.
: "${TF_VAR_github_quantile_co_token:?set a repository-scoped token}"
# gh must also be authenticated for this repository.

# The state bucket does not exist yet. This ignored override uses local state.
printf 'terraform { backend "local" {} }\n' > tf/backend_override.tf
tofu -chdir=tf init -input=false
# The GitHub repository already exists. Import ONLY if no state manages it.
tofu -chdir=tf import github_repository.self quantile.co
tofu -chdir=tf plan
# Review existing settings and import any other existing objects before apply.
tofu -chdir=tf apply

# Move that SAME state to this repository's newly created, versioned bucket.
bucket=$(tofu -chdir=tf output -raw state_bucket)
project=$(tofu -chdir=tf output -raw state_project_id)
rm tf/backend_override.tf
tofu -chdir=tf init -migrate-state \
  -backend-config="bucket=$bucket" \
  -backend-config="prefix=repository/prod"
tofu -chdir=tf state list
tofu -chdir=tf plan # confirm no unexpected changes

# Configure the values consumed by .github/workflows/repository-settings.yml.
repo=quantile-co/quantile.co
gh variable set GCP_BILLING_ACCOUNT --repo "$repo" --body "$TF_VAR_gcp_billing_account"
gh variable set GCP_QUANTILE_CO_FOLDER_ID --repo "$repo" --body "$TF_VAR_gcp_quantile_co_folder_id"
gh variable set GCP_WIF_POOL --repo "$repo" --body "$TF_VAR_gcp_wif_pool"
gh variable set GCP_WIF_PROVIDER --repo "$repo" --body "$GCP_WIF_PROVIDER"
gh variable set GH_MAINTAINERS --repo "$repo" --body "$TF_VAR_github_maintainers"
gh variable set GCP_PROJECT_ID --repo "$repo" --body "$project"
gh variable set TF_STATE_BUCKET --repo "$repo" --body "$bucket"
printf '%s' "$TF_VAR_github_quantile_co_token" | \
  gh secret set TERRAFORM_GITHUB_QUANTILE_CO_TOKEN --repo "$repo" --env prod
# Verify protected main/prod and run the manual repository-settings workflow
# plan-only. Never commit credentials, local state, .terraform/, or saved plans.
```
