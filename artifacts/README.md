# artifacts/

The knowledge base agents read from and write back to. `plan.md` says what Smaran is
*meant* to be; these files say what it *is*, why it got that way, and what is next.

| File | Answers | Write to it when |
|---|---|---|
| `progress.md` | What exists, what's a stub, what's missing | You change what exists |
| `architecture.md` | How the pieces fit; where does this change go | The shape of the system changes |
| `decisions.md` | Why is it like this; what must not be undone | You make a reversible-by-accident choice |
| `conventions.md` | How is code written here | A convention is established or changes |
| `data-model.md` | What the tables and records look like | A schema is designed or altered |
| `api-contract.md` | What endpoints exist and what they return | An endpoint is added or changed |
| `capabilities.md` | How does this map to the SIH26003 rubric | A rubric item advances |

## Rules for these files

1. **Present tense, factual.** "There is no local database." Not "we will add a local
   database." Aspirations belong in `progress.md`'s *Next* section, marked as such.
2. **Date and sign the deltas.** Decisions carry a date. Progress carries a date at the top.
3. **Never let a file lie.** A stale `progress.md` is worse than no `progress.md` — it makes
   the next agent write code against functions that don't exist.
4. **Link, don't duplicate.** One fact, one home. Cross-reference by file and section.
5. **`plan.md` is read-only.** It is the submission document. Contradictions between it and
   reality get recorded in `decisions.md`, not patched into `plan.md`.

Last reviewed: 2026-08-29
