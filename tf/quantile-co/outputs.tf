output "checkout_url" {
  description = "Hosted checkout for this catalog's billing mode. Never publish test checkout on a live site."
  value       = stripe_payment_link.capacity.url
}

output "capacity_price_id" {
  value = stripe_price.capacity_monthly.id
}

output "mode" {
  value = var.mode
}
