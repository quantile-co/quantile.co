# Workflows

**README edits:** Be very judicious. Ask the user and get explicit approval
before editing any README. Propose only necessary, succinct changes. Keep
workflow details and agent implementation guidance in `AGENTS.md`, not READMEs.

Use `check.yaml` (Check → All), `build.yaml` (Build → Build),
`plan.yaml` (Plan → Infrastructure) and `apply.yaml` (Apply → Infrastructure).
Check has exactly one job, All, which runs all application and OpenTofu checks,
including mocked module tests. All is the required status. Don't split Check
into tool-specific jobs or an aggregate gate. Build manually packages a reviewed
protected-main revision into a versioned GitHub Release; it never runs app scripts
or deploys. A separately approved repository-settings Apply must enable release
immutability before the first Build; a source merge is not Apply authorization.
Build creates a draft, attaches all assets, then publishes. Private Build must
verify immutability, protected-main Check/Build provenance and source bytes
before cloud credentials.

Use the shared `namespace-profile-quantile` runner: restricted runtime API access,
no persistent cache volumes. Retain Node.js, pnpm and OpenTofu versions during
workflow changes. Do not introduce Nix or cache tooling.

Plan and Apply remain manual, maintainer-only, protected-main/prod operations.
Preserve WIF, the concurrency group, state bucket/prefix and state locking.
Plan never applies. The repository-settings Apply bootstraps release
immutability once; subsequent Plans read its live state and fail on drift rather
than silently changing it. Repair drift only after separate review. Apply creates
and applies its own exact saved plan; do not transfer sensitive plan artifacts
or dispatch Apply without explicit approval.
