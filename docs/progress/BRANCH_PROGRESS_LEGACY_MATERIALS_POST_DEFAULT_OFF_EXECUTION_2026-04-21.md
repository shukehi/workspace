> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials POST default-off execution (2026-04-21)

## Completed
- Executed the staged default-off flip for the final remaining legacy shim:
  - `POST /api/config/materials`
- The shim now mounts only when explicitly enabled with:
  - `ENABLE_LEGACY_CONFIG_MATERIALS_POST=true`
- Updated readiness helpers and tests so the materials shim now reports:
  - `readyForControlledDisable: true`
  - `readyForDefaultOff: true`
  - `status: ready-for-default-off`

## Impact
- The application now runs with **zero default-mounted legacy shims**
- All remaining legacy compatibility is explicit opt-in only

## Notes
- Physical deletion is still pending.
- This was the final default-off flip; remaining work is delete-only cleanup.
