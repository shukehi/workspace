> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy mappings test retirement (2026-04-21)

## Completed
- Deleted `tests/mapping-routes.test.ts`
- Migrated its meaningful workflow/error coverage onto unified profile route tests
- Updated the legacy bridge manifest so `/api/config/mappings` now has no remaining bridge contract test owners
- Updated source-guard and removal-readiness tests accordingly

## Impact
- `legacy /api/config/mappings` no longer has dedicated compatibility-test value
- This route is now effectively in deletion-ready territory from a test-coverage perspective

## Notes
- The route is still mounted through the legacy bridge manifest for now.
- Final physical deletion should still be coordinated with the broader legacy bridge removal pass.
