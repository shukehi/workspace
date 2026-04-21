> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy bridge status script (2026-04-21)

## Completed
- Added `server/scripts/report_legacy_bridge_status.ts`
- Added npm script:
  - `npm run legacy:bridge:status`
- The report prints JSON with:
  - overall legacy summary
  - primary default-mounted shim
  - disable sequence
  - materials POST preflight
  - materials POST default-off assessment
  - final retirement checklist

## Impact
- The final legacy state is now queryable through one command instead of reading multiple docs/helpers
- This gives operators and future maintainers a single machine-readable status surface for closeout

## Notes
- No runtime server behavior changed in this increment.
