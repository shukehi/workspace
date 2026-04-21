> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials POST retirement bundle (2026-04-21)

## Completed
- Added `server/scripts/build_legacy_materials_post_retirement_bundle.ts`
- Added npm command:
  - `npm run legacy:materials-post:bundle`
- Generated bundle artifact:
  - `.omx/logs/legacy-materials-post-retirement-bundle-2026-04-21.json`

## Purpose
- Consolidates all internal readiness data for the final default-mounted legacy shim into one machine-readable artifact
- Makes the true boundary explicit: code-side prep is complete, external audit is still required
