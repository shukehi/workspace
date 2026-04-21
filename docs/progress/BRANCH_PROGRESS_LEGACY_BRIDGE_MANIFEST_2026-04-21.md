> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy bridge manifest (2026-04-21)

## Completed
- Centralized legacy config bridge mounts in `server/routes/legacyConfigBridge.ts`
- Added explicit bridge manifest:
  - mount path
  - successor path
  - mounted router
- Updated route aggregator to mount legacy routes through the shared bridge manifest
- Expanded non-test warning output to include concrete `mount -> successor` mappings

## Verification
- Guard tests updated to verify:
  - bridge-only mount mode is declared in the manifest
  - legacy mount definitions are centralized
  - route aggregator mounts via `mountLegacyConfigRoutes(router)`

## Notes
- This change reduces the remaining server-side legacy surface to one manifest and one mount helper.
- It is a preparation step for eventual default-off and physical deletion.
