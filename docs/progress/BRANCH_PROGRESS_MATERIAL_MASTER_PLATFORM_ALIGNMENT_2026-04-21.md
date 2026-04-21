# BRANCH PROGRESS — Material Master Platform Alignment (2026-04-21)

## Scope
Next increment after supplier master workflowization:
- align material master with the unified config/master-data platform
- expose material master through a profile/detail contract
- preserve the current operational UI while moving it under clearer platform boundaries

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect current material management UI, APIs, and model boundaries
- [x] Implement unified material master profile/detail surfaces
- [x] Adapt current material master page/services toward the unified contract
- [x] Add regression coverage, run verification, and update progress docs

## Notes
- This pass focuses on alignment, not a full material master redesign.
- Inventory/material transaction semantics should remain untouched.

## Implementation progress
- Added `material_master` to the unified profile registry and detail service.
- Added profile item routes under `/api/config/profiles/material_master/items`.
- Added `src/services/materialMasterProfileApi.ts` and adapted the material management page state to prefer the unified material master contract with compatibility fallback for existing tests.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/material-management-page-state.test.ts tests/material-master-profile-api.test.ts tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Material master is still missing diff/impact/replay/reference-check parity under the profile host.
- Material master does not yet have a dedicated profile page separate from the operational material management table.
- Material master and material catalog relationships are still implicit rather than formally linked.

## Additional progress
- Material master now exposes unified `reference-check` and joined supplier master link metadata in its front-end-facing contract.
- Material Management UI shows both profile/workflow metadata and supplier master linkage state.
