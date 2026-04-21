> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy route blocker classification (2026-04-21)

## Completed
- Added explicit retirement classification to the legacy bridge manifest:
  - `deletion-ready`
  - `blocked`
- Classified current legacy bridge mounts:
  - deletion-ready:
    - `/api/config/mappings`
    - `/api/config/material-catalog`
  - blocked:
    - `/api/config/formulas`
    - `/api/config`
- Added helper selectors:
  - `listDeletionReadyLegacyConfigRoutes()`
  - `listBlockedLegacyConfigRoutes()`
- Expanded route-aggregator warning output to include deletion-ready vs blocked route lists

## Verification
- Guard tests now assert:
  - manifest exposes retirement-state metadata
  - helper selectors exist
  - route aggregator logs deletion-ready and blocked summaries
- Removal-readiness tests now validate the concrete blocked vs deletion-ready split

## Notes
- This is a planning/control-surface increment; it does not yet physically unmount deletion-ready routes.
- The next logical step is to selectively stop mounting deletion-ready routes behind an opt-in flag or remove them entirely.
