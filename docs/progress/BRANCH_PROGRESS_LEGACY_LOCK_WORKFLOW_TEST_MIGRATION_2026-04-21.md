> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy lock workflow test migration (2026-04-21)

## Completed
- Migrated lock mapping workflow coverage from the legacy `/api/config/lock` bridge to unified profile routes
- Added unified test coverage for:
  - `GET /api/config/profiles/lock/detail`
  - `PUT /api/config/profiles/lock/draft`
  - `POST /api/config/profiles/lock/publish`
  - published payload refresh after publish
- Removed the duplicate legacy lock bridge workflow test from `tests/config-routes.test.ts`
- Cleaned up now-unused legacy lock fixture bookkeeping in the legacy test file

## Impact
- Reduces one more meaningful lock-related blocker from the legacy bridge lane
- Keeps lock workflow protection on the unified profile contract instead of the compatibility route

## Notes
- Legacy handle mapping contract still remains as a bridge-specific coverage lane.
