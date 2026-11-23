# Remove after the protected handoff has verified the original bank ID.
provider "restapi" {
  alias        = "hindsight"
  uri          = "https://api.hindsight.vectorize.io"
  bearer_token = var.hindsight_api_token
}

removed {
  from = module.hindsight.restapi_object.bank
  lifecycle {
    destroy = false
  }
}

import {
  to = module.hindsight.restful_resource.bank
  id = jsonencode({
    id                     = "/v1/default/banks"
    path                   = "/v1/default/banks/quantile-co--quantile-co"
    query                  = { q = ["quantile-co--quantile-co"], limit = ["1000"] }
    read_selector          = "[banks.#.{\"bank_id\":bank_id,\"name\":name}]|@flatten|{\"bank\":#(bank_id==\"quantile-co--quantile-co\")}"
    read_response_template = "$(body.bank)"
    body                   = { name = null }
  })
}
