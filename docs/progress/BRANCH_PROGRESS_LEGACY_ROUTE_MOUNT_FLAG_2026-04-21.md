> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# BRANCH PROGRESS — Legacy Route Mount Flag (2026-04-21)

## Scope
Next increment after legacy route boundary marking:
- introduce an operational flag to disable mounting of legacy config routes
- keep default behavior unchanged for compatibility
- establish a concrete retirement path for later rollout

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Gate legacy route mounting behind `ENABLE_LEGACY_CONFIG_ROUTES`
- [x] Add/update guard coverage for the flag contract
- [x] Run targeted verification and update progress docs

## Notes
- Default behavior remains: legacy routes mounted.
- Only when the flag is explicitly set to `false` should legacy config routes remain unmounted.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-legacy-mount-flag.test.ts tests/legacy-config-route-headers-guard.test.ts`
- Passed: `npm run type-check:server`

## Result
- Legacy config routes now have a real operational retirement switch instead of only documentation/headers.
- Default behavior remains unchanged; retirement can be trialed by setting `ENABLE_LEGACY_CONFIG_ROUTES=false`.
