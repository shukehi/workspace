> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formula lifecycle test reduction (2026-04-21)

## Completed
- Expanded unified formula item bridge coverage to include archive behavior and archived status verification
- Reduced the legacy formulas bridge test so it now validates only `published-map` compatibility behavior
- Replaced legacy route-driven create/draft/publish/archive steps with direct workflow service setup inside the legacy contract test

## Impact
- Removes most remaining lifecycle semantics from the legacy formulas route test lane
- Leaves the legacy formulas bridge responsible only for the compatibility-only `published-map` surface

## Notes
- This is a substantial reduction in legacy formulas route value as a deletion blocker.
- `/api/formulas is not mounted` coverage remains separately protected.
