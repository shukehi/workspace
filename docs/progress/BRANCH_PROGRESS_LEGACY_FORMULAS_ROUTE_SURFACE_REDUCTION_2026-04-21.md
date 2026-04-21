> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formulas route surface reduction (2026-04-21)

## Completed
- Reduced `server/routes/formulasConfig.ts` to a single compatibility endpoint:
  - `GET /api/config/formulas/published-map`
- Removed all other legacy formulas bridge handlers from the route file
- Updated bridge metadata to clarify that only `published-map` compatibility remains blocked
- Added test coverage proving:
  - `published-map` still works through the legacy bridge
  - `GET /api/config/formulas` now returns `404` even while the legacy formulas bridge remains mounted

## Impact
- Legacy formulas bridge is now effectively a single-endpoint compatibility shim
- Most formulas lifecycle behavior is no longer exposed through legacy HTTP routes

## Notes
- This makes `/api/config/formulas` the next strong candidate for eventual replacement by a smaller dedicated compatibility shim or full removal once `published-map` is retired.
