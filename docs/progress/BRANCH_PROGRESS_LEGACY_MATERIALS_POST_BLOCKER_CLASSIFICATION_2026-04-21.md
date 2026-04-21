> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials POST blocker classification (2026-04-21)

## Completed
- Added explicit default-off blocker metadata to the legacy bridge manifest
- Added helper `listLegacyDefaultOffBlockedRoutes()`
- Classified `/api/config` as:
  - blocked for retirement
  - blocked for default-off
- Expanded route-aggregator warning output to include `default-off-blocked`
- Added governance note:
  - `docs/governance/LEGACY_MATERIALS_POST_DEFAULT_OFF_BLOCKERS_2026-04-21.md`

## Outcome
- `/api/config/formulas` = first default-off candidate
- `/api/config` = still blocked due to legacy write-compatibility risk

## Notes
- This increment does not change runtime behavior.
- It makes the reason for not defaulting off `POST /api/config/materials` explicit and test-backed.
