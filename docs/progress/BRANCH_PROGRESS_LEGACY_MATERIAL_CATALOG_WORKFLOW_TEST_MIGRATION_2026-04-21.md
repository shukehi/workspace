> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy material-catalog workflow test migration (2026-04-21)

## Completed
- Added unified workflow coverage for `material_catalog` profile routes:
  - draft
  - publish
  - detail refresh
  - revisions
  - audit-logs
- Reduced legacy materials bridge coverage to only the remaining compatibility-specific `POST /api/config/materials` behavior
- Removed duplicate workflow assertions from the legacy bridge test lane

## Impact
- Moves material-catalog workflow protection onto the unified profile contract
- Leaves the legacy lane responsible only for compatibility-only write behavior

## Notes
- The remaining legacy materials test now validates bridge-specific POST compatibility plus legacy file sync.
