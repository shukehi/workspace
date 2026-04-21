> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy final shim deletion (2026-04-21)

## Completed
- Deleted the final disabled legacy write shim code and mount shell:
  - `server/routes/materialsConfigCompatibility.ts`
  - `server/routes/legacyConfigBridge.ts`
- Deleted the last dedicated legacy shim tests:
  - `tests/materials-config-compatibility-route.test.ts`
  - `tests/config-legacy-mount-flag.test.ts`
  - `tests/legacy-config-route-headers-guard.test.ts`
  - `tests/legacy-config-route-removal-readiness.test.ts`
- Removed obsolete legacy bridge scripts and npm commands
- Updated route aggregator and source guards to reflect zero legacy runtime surface

## Outcome
- There are now **zero legacy config/runtime shims** left in the application code
- Remaining references are historical docs only
