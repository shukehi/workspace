> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy bridge runtime removal (2026-04-21)

## Completed
- Removed the last runtime legacy bridge layer from the server
- Deleted:
  - `server/routes/materialsConfigCompatibility.ts`
  - `server/routes/legacyConfigBridge.ts`
  - legacy bridge helper scripts and legacy bridge tests
- Updated route aggregator to mount only unified config routes
- Verified the app now runs with zero legacy config shim endpoints in normal runtime

## Outcome
- Legacy retirement is no longer a runtime concern
- Remaining follow-up work is documentation cleanup only
