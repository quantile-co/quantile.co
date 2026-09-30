# Stripe catalog module

This module owns a reusable billing catalog, not application runtime topology.
The caller supplies explicit `mode = "test" | "live"` and a matching Stripe provider.
The provider credential selects the account and actual mode; the `mode` input does
not switch credentials. Keep test/live as distinct provider/module instances.

Outputs are `checkout_url`, `price_id`, and `mode`. Runtime configuration uses
`STRIPE_PRICE_ID`. There is one selected price, so qualifiers such as capacity or
in-progress issues are unnecessary in this interface. The product still sells
concurrent in-progress issues, not monthly throughput.

Preserve the existing resource addresses `stripe_product.capacity`,
`stripe_price.capacity_monthly`, and `stripe_payment_link.capacity`. Renaming an
output must not replace products/prices/links or require a state move. Keep USD
499500/month and adjustable quantity 1–5 unless the business offering is explicitly
changed. Catalog changes and checkout publication are separate reviewed actions.

Run backend-free init, validate, fmt and mocked `tofu test` here. These tests do not
establish live account capabilities, permissions, checkout readiness or billing
operations such as banked pause time. Consumers pinned to older module revisions
must update their pin and output reference together after publication; do not add
permanent output aliases or invent an unpublished commit SHA.
