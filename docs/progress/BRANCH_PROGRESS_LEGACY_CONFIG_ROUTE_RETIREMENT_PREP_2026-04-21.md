> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# BRANCH PROGRESS — Legacy Config Route Retirement Prep (2026-04-21)

## Scope
Next increment after profile-bridge adoption:
- make legacy config routes explicitly compatibility-only
- prepare them for future retirement without changing current behavior
- add observable signals/tests so their boundary stays intentional

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect legacy config routes and identify safe retirement-prep changes
- [x] Implement explicit compatibility markers or thin-wrapper cleanup
- [x] Add/update guard coverage for legacy route boundaries
- [x] Run targeted verification

## Notes
- This increment should not break existing consumers.
- Actual unmount/removal of legacy routes is deferred to a later phase.

## Implementation progress
- Added `server/routes/legacyConfigCompatibility.ts` to stamp explicit compatibility/deprecation headers for legacy config routes.
- Installed the middleware into `configData.ts`, `formulasConfig.ts`, `mappingsConfig.ts`, and `materialsConfig.ts`.
- Unified profile routes intentionally remain free of those legacy markers.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/legacy-config-route-headers-guard.test.ts tests/config-routes.test.ts tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Legacy routes are still mounted and behaviorally active; this pass only makes the boundary explicit.
- Actual unmount/removal still requires a later deprecation/removal phase and consumer audit.
