> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy material-catalog shape test migration (2026-04-21)

## Completed
- Migrated published material-catalog shape coverage from legacy bridge tests to unified profile detail coverage
- Expanded `tests/config-profile-routes.test.ts` to assert unified `material_catalog` detail includes:
  - object-shaped `publishedPayload`
  - supplier/unit string fields
  - canonical item payload content
- Removed the duplicate legacy bridge test that compared `/api/config/materials` with `/api/config/material-catalog/published`

## Impact
- Shrinks one more legacy materials-route blocker from `tests/config-routes.test.ts`
- Keeps material-catalog payload-shape protection on the unified profile contract

## Notes
- Legacy materials bridge still retains workflow-compatibility coverage for draft/publish/legacy POST behavior.
