> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy mappings unmount (2026-04-21)

## Completed
- Removed `/api/config/mappings` from the legacy bridge manifest
- Legacy route aggregator no longer mounts the mappings bridge, even when legacy config routes remain enabled
- Updated readiness and guard tests to reflect that mappings is no longer part of the mounted legacy surface
- Added runtime verification that `/api/config/mappings/packaging/detail` now returns `404` via the top-level route aggregator

## Impact
- This is the first actual legacy bridge unmount, not just planning metadata
- `mappingsConfig.ts` is now effectively dead code unless re-mounted explicitly

## Notes
- The source file still exists in the repo for now; this increment only stops mounting it.
- Next logical deletion step would be removing the unused route file once no remaining references matter.
