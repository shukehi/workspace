> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy final shim flags (2026-04-21)

## Completed
- Added dedicated env flags for the final two legacy shim endpoints:
  - `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP`
  - `ENABLE_LEGACY_CONFIG_MATERIALS_POST`
- Legacy bridge mounting now respects shim-specific flags via:
  - `isLegacyConfigRouteEnabled()`
  - `listMountedLegacyConfigRoutes()`
- Added runtime tests proving each final shim can be disabled independently without globally disabling all legacy routes
- Added readiness coverage for the new flag names in the final retirement checklist

## Impact
- The final two legacy shims can now be retired independently and safely
- This removes the need for an all-or-nothing final legacy flip

## Notes
- Default behavior remains unchanged: both final shim flags default to enabled
- The next step can disable one final shim at a time with low operational risk
