# BRANCH PROGRESS — Formula Collection Profile Alignment (2026-04-21)

## Scope
Next increment after extracting `FormulaProfileHost`:
- introduce a collection-profile front-end API adapter for formulas
- begin aligning formula workflow consumption with the config profile model
- keep existing formula workflow behavior stable during the transition

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect formula API and manager boundaries
- [x] Implement collection-profile adapter for formulas
- [x] Refactor formula manager to consume the adapter where safe
- [x] Run targeted verification

## Notes
- This increment is API-alignment focused, not a formula workflow rewrite.
- Existing formula endpoints remain authoritative in this phase.

## Implementation progress
- Added `src/services/formulaProfileApi.ts` as a collection-profile adapter for formulas.
- Updated formula list/detail composables and `useFormulaManager()` to consume the adapter by default.
- Formula host now exposes collection workflow metadata via the new profile adapter.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/formula-profile-api.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Formula mutations still target dedicated `/config/formulas/*` endpoints under the adapter, not a fully generic collection profile mutation protocol.
- There is still no generic collection-profile host/composable shared across domains beyond the formula-specific host.
- Legacy compatibility wrappers remain intentionally in place.
