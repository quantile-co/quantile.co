# One billing catalog per explicitly bound Stripe mode. Local app instances
# share the test catalog; they do not require Google Cloud projects or runtimes.
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
