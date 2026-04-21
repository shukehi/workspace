# BRANCH PROGRESS — Formula Profile Host Extraction (2026-04-21)

## Scope
Next increment after shell alignment:
- extract a collection-aware `FormulaProfileHost`
- reduce `ColorFormula.vue` to a thin page entry
- align formula management with the platform host pattern without changing formula workflow semantics

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect current formula view extraction boundaries
- [x] Implement `FormulaProfileHost` and slim the page entry
- [x] Add/update guard coverage for the extracted structure
- [x] Run targeted verification

## Notes
- This increment does not rewrite formula workflow logic.
- The goal is structural alignment and page-thinning only.

## Implementation progress
- Added `src/features/formulas/components/FormulaProfileHost.vue` as a collection-aware host for the formulas page.
- Slimmed `src/views/ColorFormula.vue` down to a thin page entry that only owns `useFormulaManager()` initialization.
- Updated guard coverage so the formulas page stays thin and the host owns list/editor composition.

## Verification
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts tests/mapping-config-api.test.ts tests/config-profile-routes.test.ts tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`

## Remaining roadmap gaps
- Formula workflow is still managed by `useFormulaManager()` and not yet normalized onto a generic collection profile editor contract.
- A dedicated collection-profile API layer for formulas on the front-end is still absent.
- Legacy wrappers (`ConfigPageLayout`, `useMappingConfigEditor`) remain intentionally for compatibility.
