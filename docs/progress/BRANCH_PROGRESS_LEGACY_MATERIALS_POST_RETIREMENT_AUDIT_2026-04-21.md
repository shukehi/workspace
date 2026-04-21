> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials POST retirement audit (2026-04-21)

## Completed
- Added `getPrimaryDefaultMountedLegacyShim()` helper to expose the single remaining default-mounted legacy shim
- Added test coverage that the helper resolves to `/api/config/materials`
- Added governance audit document:
  - `docs/governance/LEGACY_MATERIALS_POST_RETIREMENT_AUDIT_2026-04-21.md`

## Outcome
- The final default-mounted legacy shim now has a focused audit artifact
- Retirement work can proceed against one explicit endpoint instead of a broad legacy surface

## Notes
- No runtime behavior changed in this increment.
- This is an audit/preparation step for the final removal of the materials POST compatibility shim.
