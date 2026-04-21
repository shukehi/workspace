> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials shim test isolation (2026-04-21)

## Completed
- Moved the final materials POST compatibility contract out of `tests/config-routes.test.ts`
- Added dedicated route-level test:
  - `tests/materials-config-compatibility-route.test.ts`
- Updated legacy bridge metadata so `/api/config/materials` now points to the dedicated materials shim test file
- Updated readiness and source-guard tests accordingly

## Impact
- The final materials shim now has its own isolated compatibility test lane
- `tests/config-routes.test.ts` is now focused on the formulas shim only

## Notes
- This reduces coupling between the two remaining shim surfaces.
- It also makes the materials POST retirement audit easier to evaluate independently.
