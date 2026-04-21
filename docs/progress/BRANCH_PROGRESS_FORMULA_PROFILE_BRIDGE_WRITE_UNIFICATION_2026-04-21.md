# BRANCH PROGRESS — Formula Profile Bridge Write Unification (2026-04-21)

## Scope
Next increment after formula collection-profile alignment:
- add collection-item bridge routes under `/api/config/profiles/formulas/items/*`
- move `formulaProfileApi` read/write traffic to the profile bridge surface
- preserve existing formula workflow semantics during migration

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect existing formula route contract and define bridge item route shape
- [x] Lock behavior with regression tests
- [x] Implement formula item bridge routes and migrate `formulaProfileApi`
- [x] Run targeted verification

## Notes
- Existing `/api/config/formulas/*` endpoints remain mounted in this phase.
- The profile bridge should normalize access, not change workflow rules.

## Implementation progress
- Added collection-item bridge endpoints under `server/routes/configProfiles.ts` at `/api/config/profiles/formulas/items/*`.
- Migrated `src/services/formulaProfileApi.ts` to use the profile bridge for list/detail/revisions and all mutation traffic.
- Formula front-end traffic now reaches formulas through the unified profile namespace rather than direct `/config/formulas/*` access.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/formula-profile-api.test.ts tests/config-profile-routes.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- The old `/api/config/formulas/*` endpoints still exist and remain mounted for compatibility.
- A fully generic collection-profile abstraction shared across multiple domains is still absent; formulas currently use a dedicated collection adapter.
- Front-end collection profile metadata is only lightly surfaced in the host and not yet fully integrated into revision/history UX.
