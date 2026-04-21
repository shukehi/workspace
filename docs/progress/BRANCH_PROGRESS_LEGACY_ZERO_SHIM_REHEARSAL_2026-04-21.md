> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy zero-shim rehearsal (2026-04-21)

## Completed
- Added a runtime test proving the app can run with **both** final shim flags disabled:
  - `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP=false`
  - `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`
- Added helper `canRunWithoutLegacyShims()` to express the final zero-shim target state
- Extended the removal summary test to assert the current state is not yet zero-shim by default

## Impact
- We now have an executable rehearsal proving the bridge layer can be fully absent behind flags
- This reduces risk for the eventual final deletion of the legacy mount shell

## Notes
- This does not change default behavior.
- It demonstrates that the remaining work is a migration/operational choice, not a framework limitation.
