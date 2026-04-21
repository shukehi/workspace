> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formulas shim deletion (2026-04-21)

## Completed
- Deleted the final legacy formulas compatibility route file
- Removed the formulas shim from the bridge manifest
- Kept formulas retirement state only as historical execution metadata in helper summaries
- Updated tests so the old formulas flag no longer resurrects the shim

## Impact
- `GET /api/config/formulas/published-map` is no longer available through the bridge at all
- The bridge now has only one remaining compatibility endpoint:
  - `POST /api/config/materials`

## Verification
- Route-mount tests confirm the formulas shim remains `404` even if the old flag is set
- Bridge readiness tests now model formulas as already-executed retirement history, not an active shim
