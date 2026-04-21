> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy frontend read cleanup (2026-04-21)

## Completed
- Removed the last direct front-end runtime dependency on legacy `GET /api/config/materials`
- `configRepository.readMaterials()` now falls back from:
  - unified `/api/config/profiles/material_catalog/detail`
  - directly to static `/data/materials-catalog.json`
- Updated source-guard tests so legacy `/api/config/materials` references are now expected only in legacy compatibility tests

## Dependency scan snapshot
Remaining `legacy /api/config/*` references are now concentrated in:
- legacy-route runtime tests
- legacy-route contract tests
- server-side legacy bridge handlers
- workflow change-note strings for compatibility tracing

## Notes
- This increment intentionally avoids deleting the legacy materials route itself.
- The goal is to remove production-path consumers first, then shrink and delete the bridge later.
