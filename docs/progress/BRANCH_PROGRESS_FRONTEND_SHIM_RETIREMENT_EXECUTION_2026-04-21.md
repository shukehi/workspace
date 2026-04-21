# BRANCH PROGRESS — Frontend Shim Retirement Execution (2026-04-21)

## Scope
Next increment after shim retirement readiness confirmation:
- actually retire selected front-end compatibility shims that have no production consumers
- update guard tests to reflect the new steady state

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Remove obsolete shims with no production consumers
- [x] Update tests/guards for the retired surfaces
- [x] Run targeted verification and update progress docs

## Notes
- This pass will avoid deleting shims that still provide useful migration value if the retirement risk is non-trivial.

## Retired shims
- Removed `src/features/config-editor/components/ConfigPageLayout.vue`
- Removed `src/features/config-editor/composables/useMappingConfigEditor.ts`
- Removed `src/services/formulaApi.ts`

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-endpoint-source-guard.test.ts tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Result
- These front-end shim surfaces are now physically retired rather than merely marked as retirement-ready.
- The guard suite now enforces that they do not reappear as production dependencies.
