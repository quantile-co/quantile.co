mock_provider "stripe" {}

run "test_catalog" {
  command = plan
  variables {
    mode = "test"
  }
  override_resource {
    target = stripe_price.capacity_monthly
    values = {
      id = "price_mock_catalog"
    }
  }
  assert {
    condition     = stripe_price.capacity_monthly.currency == "usd" && stripe_price.capacity_monthly.unit_amount == 499500
    error_message = "Capacity remains $4,995 USD per month per issue."
  }
  assert {
    condition     = one(stripe_price.capacity_monthly.recurring).interval == "month" && one(stripe_price.capacity_monthly.recurring).usage_type == "licensed"
    error_message = "Capacity is a monthly licensed subscription."
  }
  assert {
    condition     = stripe_payment_link.capacity.line_items[0].adjustable_quantity.minimum == 1 && stripe_payment_link.capacity.line_items[0].adjustable_quantity.maximum == 5
    error_message = "Checkout must allow one to five concurrent issues."
  }
  assert {
    condition     = output.price_id == stripe_price.capacity_monthly.id
    error_message = "The price_id output must expose the existing catalog price."
  }
  assert {
    condition     = output.mode == "test"
    error_message = "Test catalogs must remain explicitly test-mode."
  }
}

run "live_catalog" {
  command = plan
  variables {
    mode = "live"
  }
  assert {
    condition     = output.mode == "live"
    error_message = "Live catalogs are separate module/provider instances."
  }
}

run "reject_unknown_mode" {
  command = plan
  variables {
    mode = "preview"
  }
  expect_failures = [var.mode]
}
