# One module instance per billing environment, not per PR. Deployments below
# share the catalog but never share mutable runtime/workflow definitions.
resource "stripe_product" "capacity" {
  name        = "Quantile fractional data engineering"
  description = "Concurrent in-progress issues."
  unit_label  = "issue"
}

resource "stripe_price" "capacity_monthly" {
  product     = stripe_product.capacity.id
  currency    = "usd"
  unit_amount = 499500
  recurring {
    interval   = "month"
    usage_type = "licensed"
  }
}

resource "stripe_payment_link" "capacity" {
  line_items = [{
    price    = stripe_price.capacity_monthly.id
    quantity = 1
    adjustable_quantity = {
      enabled = true
      minimum = 1
      maximum = 5
    }
  }]
}

locals {
  service_names = { for namespace, deployment in var.deployments : namespace => "${namespace}-web" }
  welcome_env = var.welcome == null ? {} : {
    WELCOME_FROM     = var.welcome.from
    WELCOME_REPLY_TO = var.welcome.reply_to
  }
  provider_secrets = var.welcome == null ? {} : {
    stripe = var.welcome.stripe_secret_version
    resend = var.welcome.resend_secret_version
  }
  workflow_secret_access = {
    for entry in flatten([
      for namespace, deployment in var.deployments : [
        for provider, version in local.provider_secrets : {
          key             = "${namespace}/${provider}"
          project         = split("/", version)[1]
          secret_id       = split("/", version)[3]
          service_account = deployment.workflow_service_account
        }
      ]
    ]) : entry.key => entry
  }
}

resource "google_secret_manager_secret_iam_member" "workflow" {
  provider = google-beta
  for_each = local.workflow_secret_access

  project   = each.value.project
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.service_account}"
}

resource "google_workflows_workflow" "welcome" {
  provider = google-beta
  for_each = var.deployments

  project                 = var.project_id
  region                  = var.region
  name                    = "${each.key}-welcome"
  description             = "Subscription welcome email (${each.key})"
  service_account         = each.value.workflow_service_account
  source_contents         = each.value.welcome_workflow_source
  deletion_protection     = false
  call_log_level          = "LOG_NONE"
  execution_history_level = "EXECUTION_HISTORY_BASIC"
  labels                  = { namespace = each.key, app_sha = each.value.app_sha }
  user_env_vars = {
    WELCOME_MODE          = var.mode
    WELCOME_TEST_SCOPE    = var.mode == "test" ? each.key : ""
    WELCOME_STRIPE_SECRET = try(var.welcome.stripe_secret_version, "")
    WELCOME_RESEND_SECRET = try(var.welcome.resend_secret_version, "")
  }

  lifecycle {
    precondition {
      condition     = var.welcome != null && length(var.alert_channels) > 0
      error_message = "Runtime deployments require approved sender/secret configuration and an alert destination."
    }
    precondition {
      condition     = var.mode == "test" ? startswith(each.key, "pr-") : each.key == "production"
      error_message = "Test deployments require a PR namespace; live deployments require the production namespace."
    }
  }
  depends_on = [google_secret_manager_secret_iam_member.workflow]
}

# Workflows IAM roles are granted at project level, not individual workflow
# level. Namespace validation in the application/workflow prevents accidental
# cross-PR use; PR namespaces are not security boundaries between trusted users.
resource "google_project_iam_member" "runtime_workflow_invoker" {
  provider = google-beta
  for_each = var.deployments

  project = var.project_id
  role    = "roles/workflows.invoker"
  member  = "serviceAccount:${each.value.runtime_service_account}"
}

resource "google_secret_manager_secret" "webhook" {
  provider = google-beta
  for_each = var.deployments

  project   = var.project_id
  secret_id = "${each.key}-stripe-webhook"
  labels    = { namespace = each.key }
  replication {
    auto {}
  }
}

resource "stripe_webhook_endpoint" "application" {
  for_each = var.deployments

  # Cloud Run's deterministic URL avoids a dependency cycle between service
  # creation, Stripe endpoint registration and mounting its signing secret.
  url            = "https://${local.service_names[each.key]}-${var.project_number}.${var.region}.run.app/api/stripe/webhook"
  enabled_events = ["invoice.payment_succeeded"]
  api_version    = "2026-08-26.dahlia"
  description    = "Quantile ${each.key}"
  metadata       = { quantile_namespace = each.key }
}

resource "google_secret_manager_secret_version" "webhook" {
  provider = google-beta
  for_each = var.deployments

  secret      = google_secret_manager_secret.webhook[each.key].id
  secret_data = stripe_webhook_endpoint.application[each.key].secret
}

resource "google_secret_manager_secret_iam_member" "runtime" {
  provider = google-beta
  for_each = var.deployments

  project   = var.project_id
  secret_id = google_secret_manager_secret.webhook[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.runtime_service_account}"
}

resource "google_cloud_run_v2_service" "application" {
  provider = google-beta
  for_each = var.deployments

  project             = var.project_id
  location            = var.region
  name                = local.service_names[each.key]
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  labels              = { namespace = each.key, app_sha = each.value.app_sha }

  template {
    service_account = each.value.runtime_service_account
    timeout         = "60s"
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
    containers {
      image = each.value.image
      ports {
        container_port = 8080
      }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      dynamic "env" {
        for_each = merge(local.welcome_env, {
          WELCOME_MODE             = var.mode
          STRIPE_CAPACITY_PRICE_ID = stripe_price.capacity_monthly.id
          WELCOME_WORKFLOW         = google_workflows_workflow.welcome[each.key].id
          WELCOME_TEST_SCOPE       = var.mode == "test" ? each.key : ""
          WELCOME_TEST_TARGET      = "preview"
          WELCOME_TEST_RECIPIENT   = "delivered@resend.dev"
        })
        content {
          name  = env.key
          value = env.value
        }
      }
      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.webhook[each.key].secret_id
            version = google_secret_manager_secret_version.webhook[each.key].version
          }
        }
      }
    }
  }
  depends_on = [google_secret_manager_secret_iam_member.runtime, google_project_iam_member.runtime_workflow_invoker]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  provider = google-beta
  for_each = var.deployments

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.application[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_monitoring_alert_policy" "welcome_failure" {
  provider = google-beta
  for_each = var.deployments

  project               = var.project_id
  display_name          = "Quantile welcome failure (${each.key})"
  combiner              = "OR"
  notification_channels = var.alert_channels
  user_labels           = { namespace = each.key }
  conditions {
    display_name = "Workflow or webhook error"
    condition_matched_log {
      filter = <<-FILTER
        severity >= ERROR AND (
          (resource.type = "workflows.googleapis.com/Workflow" AND resource.labels.workflow_id = "${google_workflows_workflow.welcome[each.key].name}") OR
          (resource.type = "cloud_run_revision" AND resource.labels.service_name = "${local.service_names[each.key]}")
        )
      FILTER
    }
  }
  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
    auto_close = "3600s"
  }
  documentation {
    mime_type = "text/markdown"
    content   = "Inspect the failed execution and Stripe subscription receipt before replaying. Resend acceptance is not inbox delivery. After extended failures, replay may produce a duplicate; prioritize sending the welcome."
  }
}
