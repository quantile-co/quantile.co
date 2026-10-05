# Project knowledge index

Detailed project knowledge lives in **Engram**, under **`quantile-co:quantile.co`**
(GitHub origin `quantile-co/quantile.co`). Main and linked worktrees share that
project; the identity must not contain machine paths, usernames or branch names.
Keep this file as the index. Do not recreate nested `AGENTS.md` files.

**README edits:** Ask for explicit approval before editing any README. Keep human
docs succinct; put agent implementation knowledge in Engram, not READMEs.
Preserve uncommitted work. Production/provider mutations require separate approval;
passing local tests or merging source does not authorize a deployment.

## Retrieve before changing code

1. Start Pi from the checkout root. Confirm `.engram/config.json` and
   `mem_current_project` select the project above; use it explicitly for memory
   searches and saves. A renamed project may require a fresh Pi session.
2. Read the repository guide plus the relevant topics below. Use `mem_search`
   with the **quoted search phrase** and explicit `project`, select the matching
   `topic_key`, then `mem_get_observation(id)` to read the full guide, not a preview.
3. If Engram or a required guide is unavailable, surface the problem and restore
   access before affected changes. Config files alone do not transfer the local
   memory database to another machine. Do not guess the missing guidance.

| Read for | Topic key | Search phrase |
| --- | --- | --- |
| Architecture, boundaries, layout and coding conventions | `guides/repository` | `"Quantile guide repository"` |
| Provider routes, verification, eligibility and runtime wiring | `guides/webhooks` | `"Quantile guide webhooks"` |
| Components, page/story composition, approved copy and visual checks | `guides/marketing` | `"Quantile guide marketing"` |
| Local commands, configuration, integration ownership and cleanup | `guides/development` | `"Quantile guide development"` |
| Shared Firestore SDK, emulator and authentication boundaries | `guides/firestore` | `"Quantile guide firestore"` |
| Welcome persistence, receipts, audit, races and recovery | `guides/welcome` | `"Quantile guide welcome"` |
| Reusable Stripe catalog, modes, outputs and mocked validation | `guides/catalog` | `"Quantile guide catalog"` |

## Maintain the knowledge

- Update the relevant stable topic, not a new duplicate or a nested guide file.
  Keep this index synchronized with any added or renamed topics.
- Imported guides preserve the full former file contents. Their old scoped-file
  links/storage instructions are superseded by this index and Engram topic
  `decisions/engram-knowledge-organization`; retain their technical constraints.
- Source and tests are authoritative. The initial guide snapshot describes the
  welcome feature at `26eab253` plus working-copy guide edits, not necessarily
  `main`. Check the current checkout; distinguish decisions from history/proposals.
- Record non-obvious invariants, failures and verification gaps; avoid transcripts
  and duplicated code descriptions. Never store credentials, customer payloads or
  raw provider errors in Git or memories. Keep knowledge owned by this repository.

Human setup: [README.md](README.md). Full local validation: `pnpm check`.
