> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials GET retirement (2026-04-21)

## Completed
- Removed `GET /api/config/materials` from `server/routes/configData.ts`
- Kept only `POST /api/config/materials` as the remaining materials compatibility shim
- Updated legacy contract test to assert:
  - legacy materials POST still works
  - legacy materials GET now returns `404`
- Updated guard tests to ensure `configData.ts` no longer exposes materials GET

## Impact
- The `/api/config` bridge is now effectively a single-write-compatibility endpoint
- Legacy materials compatibility has been reduced to the narrowest remaining useful surface

## Notes
- This makes `/api/config` much closer to final removal once POST compatibility is retired.
