> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy packaging DTO test migration (2026-04-21)

## Completed
- Migrated packaging DTO-shape protection from the legacy `/api/config/packaging-mapping` contract test to the unified profile detail test
- Expanded unified packaging detail coverage to assert:
  - `publishedPayload.supplierName` is a string
  - `publishedPayload.mappings` is an object
  - `publishedPayload.mappings` is not an array
- Removed the duplicate legacy bridge test for packaging DTO shape

## Impact
- Reduces one more legacy bridge behavior dependency in `tests/config-routes.test.ts`
- Keeps the packaging payload-shape contract protected on the unified profile surface

## Notes
- Legacy packaging alias behavior is now less valuable as a blocker because shape coverage lives on the unified route.
