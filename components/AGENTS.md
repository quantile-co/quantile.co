# Marketing UI and copy

These decisions also apply when composing components in `app/` or `stories/`.
The current source holds approved copy; do not maintain a second copy document.

## Component boundaries and styling

- Keep components standalone. `biome.json` prohibits parent and `@/` imports here;
  inject application behavior and sibling components through props from `app/`.
- Shared layout/color/spacing tokens live in [app/globals.css](../app/globals.css).
  Reuse the current `--site-content-width` and page-padding system rather than
  restoring an older per-section container-width proposal.
- Preserve light/dark themes, keyboard focus, reduced-motion behavior and semantic
  headings/lists. Decorative visuals must not become an accessibility obstacle.
- Page and Storybook composition must agree. Subscription CTAs and the FAQ's
  Subscribe link receive the same `signUpHref`; do not hardcode separate targets.

## Approved editorial decisions

- Preserve the hero in [app/page.tsx](../app/page.tsx), the three Benefits groups,
  Pricing and the 18-question FAQ unless a copy change is explicitly requested.
  Keep the FAQ's 9/9 desktop split and single-column mobile reading order.
- Capacity means **concurrent in-progress issues**, not monthly throughput, hours,
  agents or PR counts. Review consumes capacity; moving blocked/deprioritized
  work out of in-progress can free it without pretending the issue is complete.
- An issue can span sequential PRs. Do not add an unstated requirement that each
  PR must merge before work on the next begins, a hard issue-size limit or a
  turnaround promise. Daily updates are not daily delivery or seven-day support.
- Use customer-facing `you`/`your`, not provider-side `we`/`I`; name AJ where useful.
  Prefer `issues` for backlog/capacity and `code review` for review. AI tooling is
  optional: customer tooling can be used, or AJ can supply his own.
- Retain the chosen starting-at/limited-offer pricing, “Try it for a week,”
  “bank the remainder,” and intentional repetition between Benefits and Pricing.
  Do not rewrite settled wording solely to remove passive voice, jargon or repetition.
- Social proof describes AJ's experience and prior employer/customer work, not
  invented Quantile customers, endorsements, testimonials or measured outcomes.
- Do not invent banked-time expiry/conversion policies, support SLAs, legal terms,
  security guarantees or extra refund-request steps. Unresolved policies need
  owner approval, not plausible-sounding copy.

## Launch requirements are not implementation evidence

The published offer includes immediate prorated upgrades, period-end downgrades,
banked remaining time on pause, cancellation at the paid period's end, a 75%
first-week cancellation refund and non-refundable payments after that week.
Stripe's payment-collection pause alone does not implement banked service time.
Validate these flows, checkout and the promised welcome email before launch;
approved copy is not proof of working billing configuration or refund automation.
Do not change the offer to conceal missing implementation. The current page's
`https://checkout.stripe.dev/` target is a placeholder, not a production checkout.

## Visual verification

For layout or copy changes, check **320, 375, 425, 768, 1024, 1440 and 2560px**,
including light/dark themes, expanded FAQ answers, keyboard use, anchor offsets
and horizontal overflow. Preserve deliberate wrapping and matching Benefits card
line counts; inspect each requested width rather than assuming desktop proves
mobile. Storybook tests/build success does not replace rendered responsive
inspection. Component CSS modules are excluded from Biome formatting;
keep their Mantine/PostCSS syntax intact and verify the actual rendering.
