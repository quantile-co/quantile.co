output "checkout_url" {
  description = "Hosted checkout for this instance's billing mode. Do not publish test checkout on a live site."
  value       = stripe_payment_link.capacity.url
}

output "capacity_price_id" {
  value = stripe_price.capacity_monthly.id
}

output "deployments" {
  description = "Deployment references for private CI, local connected tests and Hosting rewrites. No credential values."
  value = {
    for namespace, deployment in var.deployments : namespace => {
      namespace              = namespace
      app_sha                = deployment.app_sha
      service_name           = google_cloud_run_v2_service.application[namespace].name
      runtime_url            = google_cloud_run_v2_service.application[namespace].uri
      welcome_workflow       = google_workflows_workflow.welcome[namespace].id
      workflow_revision      = google_workflows_workflow.welcome[namespace].revision_id
      webhook_secret_version = google_secret_manager_secret_version.webhook[namespace].name
      stripe_webhook_id      = stripe_webhook_endpoint.application[namespace].id
      alert_policy           = google_monitoring_alert_policy.welcome_failure[namespace].name
    }
  }
}
