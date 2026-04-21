> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy final retirement checklist (2026-04-21)

## Completed
- Added `listLegacyRetirementChecklist()` to the legacy bridge manifest helper surface
- Added removal-readiness coverage for the final two shim endpoints and their recommended retirement actions
- Added governance checklist document:
  - `docs/governance/LEGACY_FINAL_SHIM_RETIREMENT_CHECKLIST_2026-04-21.md`

## Final remaining shim endpoints
1. `GET /api/config/formulas/published-map`
2. `POST /api/config/materials`

## Recommended order
1. Retire formulas `published-map`
2. Retire materials legacy POST
3. Delete the bridge manifest when no mounts remain

## Notes
- This increment does not remove either final shim yet.
- It turns the final retirement sequence into an explicit, test-backed checklist.
