# BRANCH PROGRESS — Formula API Compatibility Shell (2026-04-21)

## Scope
Next increment after formula profile bridge unification:
- demote `formulaApi` to a compatibility shell role
- keep `formulaProfileApi` as the canonical front-end surface for formulas
- reduce accidental future drift back to legacy formula endpoints

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect remaining `formulaApi` consumers and define shell strategy
- [x] Demote `formulaApi` into a compatibility-facing layer where safe
- [x] Add/update guard coverage for canonical formula API ownership
- [x] Run targeted verification

## Notes
- This increment is about ownership and architecture boundaries, not changing formula behavior.
- The server legacy endpoints can remain mounted during this pass.

## Implementation progress
- Refactored `src/services/formulaApi.ts` into a pure compatibility shell over `formulaProfileApi`.
- Kept the legacy module path valid so older imports do not break while the canonical implementation now lives in the profile bridge adapter.
- Updated source guards so direct `/config/formulas` reads are now isolated to the runtime fallback path in `configRepository.ts`.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/formula-api-compatibility.test.ts tests/formula-profile-api.test.ts tests/config-endpoint-source-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- `configRepository.ts` still falls back to `/config/formulas/published-map` for runtime formulas when snapshot is unavailable.
- Server legacy formulas endpoints remain mounted for compatibility.
- A future pass can decide whether to retire `formulaApi.ts` entirely once no compatibility consumers remain.
