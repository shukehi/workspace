# Config Center Refactor Lore Commit Draft (2026-04-21)

## Suggested commit message

```text
Retire the legacy config bridge after unifying config and master-data flows

The config center now reads and writes through the unified profile/master-data
surfaces, so the remaining legacy compatibility routes were reduced step by step
until the runtime bridge could be removed entirely. This closes the migration
from scattered config endpoints to one platform model, while preserving the
new master-data relationships and diagnostics introduced during the refactor.

Constraint: Runtime config loading had to remain boot-safe while the legacy and unified paths coexisted
Constraint: Historical compatibility needed to be reduced incrementally so regressions stayed observable
Rejected: One-shot removal of every legacy endpoint at the start | too risky without staged proofs
Rejected: Keep the compatibility bridge indefinitely | would preserve dual-path maintenance burden
Confidence: high
Scope-risk: broad
Reversibility: messy
Directive: Do not reintroduce `/api/config/*` runtime shims; extend only the unified `/api/config/profiles` and `/api/config/masters` surfaces
Tested: `npm run type-check`; `npm run type-check:server`; targeted unified-route and legacy-retirement tests during migration
Not-tested: Full manual smoke pass across every config-center page after the final deletions
Related: docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md
Related: docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md
```

## Notes
- This draft is intended for the final squash or main integration commit.
- If you split the work into multiple commits, keep this as the final umbrella commit and shrink earlier commit scopes accordingly.
