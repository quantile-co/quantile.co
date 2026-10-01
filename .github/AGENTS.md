# Workflows

**README edits:** Be very judicious. Ask the user and get explicit approval
before editing any README. Propose only necessary, succinct changes. Keep
workflow details and agent implementation guidance in `AGENTS.md`, not READMEs.

Use `check.yaml` (Check → All), `plan.yaml` (Plan → Infrastructure) and
`apply.yaml` (Apply → Infrastructure). Check has exactly one job, All, which runs
all application and OpenTofu checks, including mocked module tests. All is the
required status. Don't split Check into tool-specific jobs or an aggregate gate.

Use the shared `namespace-profile-quantile` runner: Restricted runtime API access,
no persistent cache volumes. This rollout changes runners and naming only;
retain Node.js, pnpm and OpenTofu versions. Do not introduce Nix or cache tooling.

Plan and Apply remain manual, maintainer-only, protected-main/prod operations.
Preserve WIF, the concurrency group, state bucket/prefix and state locking.
Plan never applies. Apply creates and applies its own exact saved plan; do not
transfer sensitive plan artifacts or dispatch Apply without explicit approval.
