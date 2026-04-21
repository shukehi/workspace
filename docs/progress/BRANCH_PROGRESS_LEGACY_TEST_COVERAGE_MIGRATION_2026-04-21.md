> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy test coverage migration (2026-04-21)

## Completed
- Migrated formula supplier/model canonicalization coverage from legacy bridge test surface to unified profile contract coverage
- Added unified test in `tests/config-profile-routes.test.ts` for:
  - `POST /api/config/profiles/formulas/items`
  - canonicalization from supplier + model split to material code
- Removed the duplicate legacy bridge version of the same behavior from `tests/config-routes.test.ts`

## Impact
- Shrinks the behavioral surface that still requires legacy formulas endpoints for meaningful coverage
- Keeps the normalization behavior protected while reducing one deletion blocker from the legacy bridge lane

## Notes
- Legacy formulas route still retains compatibility-contract coverage for lifecycle and list shape
- This is an incremental reduction, not the final retirement step
