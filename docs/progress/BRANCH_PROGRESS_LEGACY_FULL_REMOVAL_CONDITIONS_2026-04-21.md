> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy full removal conditions (2026-04-21)

## Completed
- Added `getLegacyBridgeRemovalPlanSummary()` helper to the bridge manifest
- Added test coverage for the near-final legacy removal summary
- Added governance document:
  - `docs/governance/LEGACY_BRIDGE_FULL_REMOVAL_CONDITIONS_2026-04-21.md`

## Summary snapshot
- Total legacy mount families still present: 2
- Mounted by default: `/api/config`
- Fully retired families:
  - `/api/config/mappings`
  - `/api/config/material-catalog`
- Remaining default-mounted shim endpoint:
  - `POST /api/config/materials`
- Default-off candidate prepared:
  - `/api/config/formulas`

## Notes
- This increment does not change runtime behavior.
- It turns the final legacy teardown plan into a code-backed, test-backed summary plus governance artifact.
