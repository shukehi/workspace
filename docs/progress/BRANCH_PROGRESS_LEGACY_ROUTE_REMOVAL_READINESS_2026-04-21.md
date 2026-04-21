> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy route removal readiness (2026-04-21)

## Completed
- Added explicit `contractTests` ownership metadata to the legacy bridge manifest
- Added removal-readiness coverage in `tests/legacy-config-route-removal-readiness.test.ts`
- Verified remaining legacy route references are now isolated to:
  - server bridge wiring
  - mount-flag coverage
  - dedicated bridge contract tests

## Current deletion blockers
- `tests/config-routes.test.ts`
- `tests/mapping-routes.test.ts`
- `tests/config-legacy-mount-flag.test.ts`
- `server/routes/index.ts`
- `server/routes/legacyConfigBridge.ts`

## Notes
- This is the final bookkeeping pass before deciding whether to:
  - flip legacy mounts default-off, or
  - physically delete individual bridge routes.
- No production-path consumer references were reintroduced in this increment.
