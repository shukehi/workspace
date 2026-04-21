# BRANCH PROGRESS — Formula Direct Read Cleanup (2026-04-21)

## Scope
Next increment after formulas profile-bridge write unification:
- identify remaining front-end reads that still directly target legacy formula/config endpoints
- route those reads through runtime snapshot or the formula profile layer where safe
- reduce front-end dependence on legacy config endpoint shapes

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect remaining front-end legacy formula/config reads
- [x] Refactor remaining read paths to unified surfaces
- [x] Add/update guard coverage
- [x] Run targeted verification

## Notes
- This increment targets read-path cleanup only.
- Legacy server endpoints may remain mounted for compatibility after this pass.

## Implementation progress
- Replaced the Dashboard formula count read with `formulaProfileApi.list()` instead of a direct `/config/formulas` request.
- Moved front-end formula mutation error typing to `formulaProfileApi` so formula draft logic no longer imports from the legacy API module for type-only usage.
- Added guard coverage to keep direct `/config/formulas` reads isolated to the legacy adapter files only.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/formula-profile-api.test.ts tests/config-profile-routes.test.ts tests/config-endpoint-source-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- `src/services/formulaApi.ts` still exists as a compatibility layer over legacy endpoints.
- `src/services/configRepository.ts` still reads `/config/formulas/published-map` for runtime formulas until a snapshot-native formula revision contract exists.
- Server-side legacy formula endpoints remain mounted for compatibility.

## Final cleanup progress
- `configRepository.readFormulas()` now reads unified formulas profile detail instead of the legacy published-map endpoint.
- Front-end source code no longer contains direct `/config/formulas` reads.

## Final verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-loader-mapping.test.ts tests/config-endpoint-source-guard.test.ts`
