# Public application memory

Current source, tests and deployment skills take precedence. Keep public guidance
self-contained; never copy private infrastructure procedures or deployment history
here. Source releases are not site deployments.

## Memory policy

Keep durable repository decisions, unresolved issues and deployment outcomes.
Exclude machine-specific information, temporary paths, session handoffs, routine
check counts and investigation transcripts. Never retain credentials, customer
payloads, state, saved plans or live Checkout URLs. Commit sanitized notes with
related changes without recurring note-only validation cycles.

## Application and UI

This branch contains a newsletter homepage/archive, Markdown articles,
consulting and campaign letters, brand downloads and a minimal 404, with optional
Fathom analytics. Checkout, webhooks, welcome email, database access, provider
integration tooling and Storybook are removed. This source state is not evidence
of a deployed rollout or external-resource retirement. Preserve approved copy;
the campaign letter's closing invitation and video remain placeholders.

Preserve the current responsive design, light/dark themes, keyboard access,
reduced-motion behavior and semantic structure. Components receive siblings
through props; avoid service locators and unnecessary abstractions. Keep focused
tests for current behavior rather than retaining coverage for deleted features.

Landing pages use explicit `app/(lp)/lp/<slug>/page.tsx` routes, starting with
`/lp/data-quality`. Campaign routes are temporarily disabled: the `(lp)` layout
calls `notFound()` before rendering its children, producing HTTP 404 responses.
Their page components, copy and tests remain intact. Restore the layout’s children
passthrough to re-enable them; retain noindex and sitemap/navigation exclusions. Each route owns its copy and
metadata and composes `components/LandingPage` with social proof and a booking
action through props. Its newsletter P.S. is part of the letter after the signature/booking row;
routes inject `newsletterForm` with `NewsletterSubscribeForm`. That form supports
stacked/inline layouts, a compact input with an inset arrow submit control, and
presentation-only button props. The submit button is enabled
for interaction preview, with native email validation and prevented submission. No dynamic registry or CMS is needed.

The `(root)` layout adds `components/Header` to normal site pages. The header
links to `/newsletter` and `/consulting`, with no booking CTA. The root 404 includes
the same header explicitly. The top-level layout owns providers, analytics and
the shared footer with its always-visible theme control. Header, footer and widest
page content use Mantine `xl` containers with matching horizontal padding;
reading layouts remain narrower. Campaign landing pages
have no header; header visibility is structural, not pathname-based.

The homepage and newsletter archive share `NewsletterHero` with the title
"The AI newsletter for data leaders." and an injected `NewsletterSubscribeForm`
with a compact, labeled “Subscribe →” control.
The homepage displays up to twelve items in a responsive 1/2/3-column grid,
without dates: eleven articles and one consulting preview. Article cards show title,
summary, then contributor portrait/name without “By”. The archive displays
up to ten horizontal items with Newest/Oldest sorting: nine articles
and one consulting preview. Both use URL-based pagination and place the consulting
preview as close to the midpoint of each page as possible, including partial pages.
Consulting previews also show AJ Welch's contributor byline, without a date.
Their wordmark tiles invert the surrounding theme: light-on-dark in light mode,
dark-on-light in dark mode.
Articles and the consulting item share `NewsletterArticleListItem`; routes supply
links, titles, subtitles, image/wordmark slots and optional dates, byline slots or labels.
Archive articles show date, title, summary, then contributor portrait/name without “By”.
`PaginationControls` contains only generic pagination controls, not the collection;
routes supply its pathname, optional query parameters, anchor and accessible label.
Components stay in flat, per-component directories; newsletter components use the
`Newsletter` prefix.

`lib/newsletter.ts` reads Markdown/frontmatter from `content/newsletter/*.md`
on the server; no content API or CMS is needed. Article filenames define
`/newsletter/<slug>` routes, statically generated from those files. The initial
14 articles/images are explicitly marked placeholders, noindexed on detail pages
and excluded from the sitemap. Replace their content and remove `placeholder: true`
when publishing real articles. The subscription form has no provider integration
and only previews form interactions; it does not collect or send addresses.
Each article requires a `contributor` ID in frontmatter, resolved through the small
typed map in `lib/newsletter.ts`; missing or unknown IDs fail loading.
AJ Welch (`aj-welch`) is the current contributor. The shared portrait lives at
`public/images/contributors/aj-welch.webp` and is also used by consulting.
`NewsletterArticleByline` receives a contributor and optional date through props and renders the
portrait and name, without “By” on any page. Article pages include the semantic
publication date within a horizontal byline, ordered contributor then date. The article header keeps
that row close beneath the summary, with space for future right-aligned sharing
controls. Archive dates sit above their titles, and homepage cards omit dates.
Article prose, summary and forwarded-newsletter prompt use Mantine `lg` (18px)
below `sm` (768px) and `xl` (20px) from `sm`, with the standard `md` line-height
(1.55). The 800px outer container
retains 752px of desktop reading width; title and Markdown heading sizes are unchanged.
Article pages reuse the existing subscription form in two places: a forwarded-newsletter
prompt between the byline and cover, bounded by horizontal rules, and the footer.
The forwarded prompt stays left-aligned. Article-width container queries keep it
on one line when wide and split its two sentences into a content-sized column at
intermediate widths. The adjacent input fills remaining width with an 8px gap.
At article widths of 28rem or less, each prompt sentence gets its own line with
balanced wrapping, and the input stacks below at full width. Keep this CSS-only; there is no
inline form sizing, text measurement or resize observer.
Balanced text alone does not shrink its containing box; do not compensate by
right-aligning it.
There are no contributor profile routes, multi-contributor arrays, share controls
or additional publishing dependencies.

Newsletter editorial skills are selected by the root package's native `skills`
declarations and installed explicitly with `pnpm run skills:sync`: `copy-editing`
(Corey Haines), `blog-editor` (Daniela Baron), and `blog-writing-guide` (Sentry).
The direct full-commit pins work independently of Factory's published catalog.
The blog editor uses its self-contained revision before the additional `clarity`
dependency. Use these for specific, justified rewrites and technical review;
preserve the contributor's meaning and verify claims rather than inventing evidence.
Sentry's company voice and SEO prescriptions are not Quantile publication
requirements. Keep this site's frontmatter schema and shared contributor/byline components.

`lib/metadata.ts` supplies shared metadata defaults; routes retain their own copy
and canonical URLs. Homepage positioning covers newsletter and consulting. Open
Graph and Twitter share explicit images; placeholders use the branded PNG fallback,
while published articles use their cover. Brand keeps its route-specific file-based
social images. The homepage emits Organization and WebSite JSON-LD; published
articles emit BlogPosting JSON-LD with a Person author; article metadata also names
the contributor using the standard SEO `authors` and Schema.org `author` fields.
Ordinary pagination stays self-canonical; alternative archive sorting is noindex. Sitemaps
exclude placeholders, campaigns and query variants, without synthetic update dates.

`/consulting` uses the letter layout without video or sidebar. At every viewport,
a single portrait sits above “Hi, I’m AJ.”, without a name/email caption and with
a shared left edge. Its size is twice the responsive title font size (64–96px).
Portrait-to-title and title-to-opening gaps are both 20px. The H1 matches newsletter article title
typography, with cap-height trimming. “I’ve been a software engineer for over
15 years at:” starts the full-width letter below that heading in ordinary body text.
Consulting and articles use the same 800px container and responsive page padding,
retaining 752px of desktop content width. Both use 64px of outer top spacing below the site header. The portrait row
preserves article-title font leading and aligns the image to its cap height,
so the portrait matches the article’s visible title top rather than its line-box top. Body text is 18px below `sm`, 20px from `sm`, with 1.55 line-height
and normal tracking. Consulting bullets use 18px, forming two columns from
576px and stacking below it. The body remains placeholder lorem ipsum.

Consulting and articles share `NewsletterSubscribeFooter`: a divider, centered
newsletter title and compact signup form, injected through props. Consulting
has one form below the letter and no P.S.; its closing signature/email and booking
CTA remain. Article forwarded signup is unchanged. Shared compact controls retain
their border/focus behavior and preview-only submission.
`LandingPage` accepts container sizing/padding and composed heading/footer slots;
the obsolete sidebar API/styles are removed. The retained campaign keeps its
existing headline, video, P.S. and signup styling. Consulting copy remains
independent of `/lp/data-quality`; do not extract a shared letter-content component.

The letter uses an external booking link and a mailto link, not an embedded
calendar or local form. Social proof shows Google, CompilerWorks and Chartio in
three static columns at every viewport down to 320px. Company names stay beside
their square marks. Full, unwrapped bylines and “· Clients:” share a left-aligned
line below. A shared 3px gap separates the company header, byline and client-logo
row. CompilerWorks has a wider column so its name stays on one line.
Smaller client logos use evenly spaced slots within each company column, with
left-aligned names underneath. Fluid sizing replaces carousel state and
social-proof layout breakpoints.
The signature and closing CTA share a row. The reusable landing component owns
the responsive letter styles; brand markup/styles remain alongside its route.

Keep `/brand`, its downloads, sitemap entry and generated assets. Its source and
generated social images live under `app/(root)/brand`; `packages/brand/assets.ts`
owns those output paths. The 404 retains its central home button. README edits
require explicit approval.

## Factory and workspace tooling

JS/TS workspace names include organization and repository:
`@quantile-co/quantile.co-<name>`, adding `-cli` for CLI apps.
This applies to `packages/` as well as `apps/`. The root remains
`@quantile-co/quantile.co`.

The application lives in `apps/web/`, including Next, site-native configuration,
tests and brand assets. Its build is `next build`; root commands
orchestrate pnpm/Turbo workspaces. Keep app semantics and approved copy unchanged.
`packages/brand` owns the shared generator and `quantile-brand-assets` CLI.
Apps consume it as a workspace dependency. The CLI writes/checks the calling
app directory; library functions accept an explicit output directory.
`packages/testing` exports the Next Image browser-test stub; it is not production
UI. Both packages stay flat. The web app's `lib/` holds server-side content loading.
The root AGENTS index remains canonical. Next's documented `agentRules: false`
prevents `next dev` from creating a nested guide after relocation; agents still
read version-matched documentation from the web workspace's installed Next package.

`apps/repo/` owns repository checks/fixes. Development runs native `next dev`;
ordinary tests run Vitest unit/browser projects directly, with no emulator,
provider credentials or tunnel. Direct TypeScript scripts and the asset CLI run
through `tsx`.

Factory is composed through explicit `lib.evalModules`, package/file selections,
and Files then Pi shell hooks. `.envrc` sources optional ignored `.envrc.local`
before entering the pinned shell.
Meaningful `nix/<tool>/default.nix` renderers own site configuration; Factory
provides native defaults and formatting. Managed files are tracked regular copies;
Check compares both worktree and index. Manifests and locks remain seed/tool-owned.
Install dependencies explicitly, then run checks. Neither shell entry nor checks
install dependencies or synchronize skills. Turbo caches reproducible build outputs
locally by default; checks, fixes and tests always execute.

Local caching remains the default. CI persists .turbo/cache on the existing
Restricted Namespace volume and may use remote team main in this repository's
workspace. Use one expiring, cache-only read/write TURBO_TOKEN organization
secret with GitHub visibility `all`, covering every current and future repository
in this organization, without repository or environment shadowing copies.
As with Cachix, authorized repository workflow writers are trusted across the
shared remote cache. Main-only publication is workflow policy,
not a secret-release boundary. Check uses remote:r; trusted main Test/Build may
use remote:rw. External/fork PRs receive no remote token; developers use user-bound,
server-scoped readers. Keep prod/provider protections and platform-enforced
main-only volume snapshot publication unchanged. Checks/tests/fixes and Plan/Apply
remain uncached. Credential changes require separate approval and live verification.
The current organization CI writer expires on 2027-02-03. The original 2026-10-25
qualification used CI readers and cache-only prod writers with a 2027-01-23 expiry;
those prod overrides are no longer used by CI.
On 2026-10-25, population run 40190338612 and verification run 40191374711
qualified all four cache layers on quantile-4x8: Turbo local-only and remote-only
hits, changed-input misses, Nix store reuse with builds/substitutions disabled,
and signed remote imports from the intended Cachix cache into an empty isolated store.
Volume snapshots initially missed or were stale; later independent runners reused
both caches. This is best-effort fleet-local reuse, not guaranteed freshness.
Repository/profile isolation, Restricted access and main-only publication were
unchanged. Other profiles are not implicitly warm. Temporary diagnostics were
removed. The rejected separate-environment plans are obsolete and must not be applied.

Exact published `@quantile-co/factory-github@0.1.0` and
`@quantile-co/factory-pi@0.1.0` replace copied runtime code. Pi loads the prebuilt
extension through native settings. `pnpm run skills:sync` explicitly installs
the selected deploy and web-quality catalog into ignored native skill locations;
the committed skills lock records provenance. Do not recreate shared extensions,
copied skills or a consumer `etc/` tree.

## Source release and infrastructure boundaries

`apps/github/` owns workflow entry points and immutable source publication.
Check, Test, Build, Plan and Apply remain distinct operations. Build uses trusted
pinned tooling, separately checks out candidate source, verifies exact-source Check,
selected attempt/All job, main ancestry and the committed `apps/web/package.json`
version/build script. Never execute candidate code with the publishing token.
API errors are not absence; existing tags/drafts stop publication. Retry visibility
reads only, never publication writes. Verify exact commit/tag and release immutability.

Each new publication needs an unused immutable version matching
`apps/web/package.json`; never republish an existing tag.

GitHub's automatic source archive is the sole handoff: no custom ZIP, Rules asset
or release manifest. Commit the complete root pnpm workspace/lock/Turbo configuration
and app-native files so source builds require no Nix materialization. Firebase App
Hosting supports the Turborepo workspace with archive `rootDirectory: apps/web`;
the web build remains `next build`, not a custom Docker/image build. Keep private
runtime configuration out of public source. `apps/web/next.config.ts` owns
security/cache headers through its `nix/next/default.nix` source. Source releases no longer require Firebase Hosting
configuration or Firestore Rules files; deployment consumers must use the matching
landing-page-only archive contract.

The single `tf/` root owns repository/state infrastructure, not application
deployment or a reusable Stripe catalog. Keep the existing bucket, resource
addresses, lineage and immutable-release guard. Its active backend is
`quantile.co/prod/infrastructure`; the old `repository/prod` live state was retired.
Do not recreate the old backend or add a runtime fallback. Future resource
operations require fresh Plan review and separate exact Apply authorization.

Owner/member identity pairs live in Terraform source. Workflow actor-roster
variables are no longer inputs; retain protected main/prod, required All, Namespace
runners, WIF/IAM and production/source-release serialization. Q0-supplied WIF remains
a standing workflow setting. Only provider subprocesses receive repository
credentials and native provider mappings; storage transport receives a separate
allowlisted environment.

Plan/Apply run locked `tsx` directly, outside Turbo and without a tooling-build
prerequisite. Frozen installation immediately precedes each workflow task.
Plan stores saved bytes and private diagnostics in GCS. Apply consumes the exact
operator-selected `GH_PLAN_REF` generation without replanning. No GitHub plan
artifact or receipt is produced. Build/publication, Plan, Apply,
state migration and credential changes each require separate authorization.

## Completed public rollouts

- Workspace/backend cutover: state-only Apply `40171942856` from source
  `20190f991c8517f294cd6b6a76dc0ff00bab9918` moved `repository/prod` to
  `quantile.co/prod/infrastructure` in the existing bucket. Native migration
  preserved lineage and operational resource/provider/output content with exactly
  one serial increment; only transient top-level validation-check metadata was
  allowed to normalize. Create-only byte-verified raw backups were held outside
  plan-reader access until approved post-lifecycle retirement. Exact-generation
  CAS retired the old live object. Maintenance Apply `40177161874` subsequently
  deleted 19 obsolete object generations: seven recovery copies/logs, nine old
  backend versions and three noncurrent active-backend versions. Current state,
  saved plans and bucket safeguards were excluded. Temporary migration and
  maintenance code, tests and workflow overrides are removed. The original
  state-only cutover did not itself authorize resource operations or rollout.

- Factory migration: immutable `v0.2.16`, Build `39475543087`; Plan `39476218139`,
  receipt `12288689117`, approved Apply `39477215702`. Ten address moves preserved
  resources, with no replacements/deletions. Storage audit logging and plans-only
  review access were established. Temporary handoff, moves, provider alias and
  legacy gate were removed. Ordinary Plan `39479160577` confirmed convergence.
- Configuration/release-tool refactor: source `42561c3`, immutable `v0.2.17`, Build
  `39493415503`; no-change Plan `39494880931`, receipt `12297920416`, approved Apply
  `39496148733`. Review is closed; no saved-plan approval carries forward.
- Paired configuration contract: source `2acdf432549a7127185babb6fd882c3324ee8942`,
  immutable `v0.2.20`, Build `39920543291`; repository-infrastructure Apply
  `39923368115` succeeded. The temporary module-address move is retired. This
  release and Infrastructure Apply do not establish a site deployment or authorize
  another production phase.

These were source/repository-infrastructure rollouts, not site deployments or
external-resource retirement. They do not authorize another production phase.
