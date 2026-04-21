> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy configData route surface reduction (2026-04-21)

## Completed
- Reduced `server/routes/configData.ts` to materials-only compatibility behavior:
  - `GET /api/config/materials`
  - `POST /api/config/materials`
- Removed legacy mapping aliases and compatibility handlers from `configData.ts`:
  - `/packaging`
  - `/cylinder`
  - `/lock`
  - `/lock-fork`
  - `/handle`
  - `/packaging-mapping`
- Updated guard coverage to assert the route now exposes only materials compatibility behavior

## Impact
- The remaining `/api/config` bridge is now much narrower and more honest about its purpose
- All legacy mapping-style config aliases are effectively retired from the mounted bridge surface

## Notes
- The next logical step is to evaluate whether `GET /api/config/materials` is still worth keeping or whether only the legacy POST write-compatibility should remain.
