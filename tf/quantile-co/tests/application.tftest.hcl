# Credential-free schema/plan tests. No resources are created in any provider.
mock_provider "google-beta" {}
mock_provider "stripe" {}

variables {
  project_id     = "application-module-test"
  project_number = "123456789012"
  region         = "us-central1"
  mode           = "test"
}

run "catalog_only" {
  command = plan

  assert {
    condition     = stripe_price.capacity_monthly.unit_amount == 499500 && stripe_price.capacity_monthly.currency == "usd"
    error_message = "Capacity pricing must remain $4,995 USD per issue."
  }
  assert {
    condition     = stripe_payment_link.capacity.line_items[0].adjustable_quantity.minimum == 1 && stripe_payment_link.capacity.line_items[0].adjustable_quantity.maximum == 5
    error_message = "Checkout must allow 1–5 concurrent issues."
  }
  assert {
    condition     = length(google_workflows_workflow.welcome) == 0 && length(google_cloud_run_v2_service.application) == 0
    error_message = "A catalog-only extraction must not provision or replace application runtimes."
  }
}

run "isolated_previews" {
  command = plan
  variables {
    welcome = {
      from                  = "Test <welcome@example.com>"
      reply_to              = "help@example.com"
      stripe_secret_version = "projects/application-module-test/secrets/stripe-test/versions/latest"
      resend_secret_version = "projects/application-module-test/secrets/resend-test/versions/latest"
    }
    alert_channels = ["projects/application-module-test/notificationChannels/test"]
    deployments = {
      pr-1 = {
        image                    = "example.com/application@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        app_sha                  = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        welcome_workflow_source  = "main:\n  steps:\n    - done:\n        return: first\n"
        runtime_service_account  = "pr-1-web@application-module-test.iam.gserviceaccount.com"
        workflow_service_account = "pr-1-workflow@application-module-test.iam.gserviceaccount.com"
      }
      pr-2 = {
        image                    = "example.com/application@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        app_sha                  = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        welcome_workflow_source  = "main:\n  steps:\n    - done:\n        return: second\n"
        runtime_service_account  = "pr-2-web@application-module-test.iam.gserviceaccount.com"
        workflow_service_account = "pr-2-workflow@application-module-test.iam.gserviceaccount.com"
      }
    }
  }
  assert {
    condition     = length(google_cloud_run_v2_service.application) == 2 && length(google_workflows_workflow.welcome) == 2 && length(stripe_webhook_endpoint.application) == 2
    error_message = "Each PR needs its own runtime, workflow and webhook endpoint."
  }
  assert {
    condition     = google_workflows_workflow.welcome["pr-1"].source_contents != google_workflows_workflow.welcome["pr-2"].source_contents
    error_message = "Deploying one PR must not overwrite another PR's reviewed YAML."
  }
  assert {
    condition     = google_workflows_workflow.welcome["pr-1"].user_env_vars.WELCOME_TEST_SCOPE == "pr-1" && google_workflows_workflow.welcome["pr-2"].user_env_vars.WELCOME_TEST_SCOPE == "pr-2"
    error_message = "Workflows must enforce their own PR namespaces."
  }
  assert {
    condition     = stripe_webhook_endpoint.application["pr-1"].url != stripe_webhook_endpoint.application["pr-2"].url && length(google_monitoring_alert_policy.welcome_failure) == 2
    error_message = "Endpoints and alerts must remain PR-scoped."
  }
  assert {
    condition     = length(google_secret_manager_secret.webhook) == 2 && length(google_secret_manager_secret_iam_member.workflow) == 4
    error_message = "Use distinct signing secrets and explicit provider-secret grants per PR."
  }
}

run "reject_unpinned_images" {
  command = plan
  variables {
    deployments = {
      pr-1 = {
        image                    = "example.com/application:latest"
        app_sha                  = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        welcome_workflow_source  = "main: {}"
        runtime_service_account  = "test@example.com"
        workflow_service_account = "test@example.com"
      }
    }
  }
  expect_failures = [var.deployments]
}
