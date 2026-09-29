variable "mode" {
  description = "Billing mode. Bind a matching Stripe provider; never switch an existing catalog between test and live."
  type        = string
  validation {
    condition     = contains(["test", "live"], var.mode)
    error_message = "Mode must be test or live."
  }
}
