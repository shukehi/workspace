> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy handle workflow test migration (2026-04-21)

## Completed
- Migrated handle mapping workflow coverage from the legacy `/api/config/handle` bridge to unified profile routes
- Added unified test coverage for:
  - `GET /api/config/profiles/handle/detail`
  - `PUT /api/config/profiles/handle/draft`
  - `POST /api/config/profiles/handle/publish`
  - published payload refresh after publish
- Removed the duplicate legacy handle bridge workflow test from `tests/config-routes.test.ts`
- Cleaned up now-unused legacy handle fixture bookkeeping in the legacy test file

## Impact
- Reduces another meaningful blocker from the legacy bridge lane
- Keeps handle workflow protection on the unified profile contract instead of the compatibility route

## Notes
- Remaining legacy bridge coverage is now heavily concentrated on formulas lifecycle and legacy materials POST compatibility.
