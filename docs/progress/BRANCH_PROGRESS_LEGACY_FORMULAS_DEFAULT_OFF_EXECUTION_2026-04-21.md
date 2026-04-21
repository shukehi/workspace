> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formulas default-off execution (2026-04-21)

## Completed
- Executed the staged default-off flip for the formulas published-map shim
- `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP` now defaults to disabled when unset
- Added runtime verification that:
  - formulas published-map shim is `404` by default
  - formulas published-map shim can still be re-enabled explicitly with `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP=true`

## Impact
- The first final shim is no longer part of the default mounted legacy surface
- The default legacy bridge now effectively centers on the remaining materials POST compatibility shim

## Notes
- This is a default-off flip, not a physical deletion.
- The formulas shim still exists for controlled rollback or explicit compatibility enablement.
