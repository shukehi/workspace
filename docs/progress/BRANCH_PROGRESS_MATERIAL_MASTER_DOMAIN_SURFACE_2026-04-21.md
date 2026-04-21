# BRANCH PROGRESS — Material Master Domain Surface (2026-04-21)

## Scope
Next increment after material master profile alignment:
- add a lower-level `/api/config/masters/materials*` domain surface
- mirror the supplier master shape so master-data domains are more symmetric
- keep unified `material_master` profile routes as the higher-level platform entry

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Implement materials master routes (`/config/masters/materials*`)
- [x] Add a minimal front-end wrapper for the lower-level master routes
- [x] Add regression coverage
- [x] Run targeted verification and update progress docs

## Implementation progress
- Added `/api/config/masters/materials` and `/api/config/masters/materials/detail` plus item create/update routes in `configMasters.ts`.
- Added `src/services/materialMasterApi.ts` as the lower-level master-data wrapper.
- The lower-level materials master surface now mirrors supplier master semantics more closely.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts tests/material-master-api.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- The current Material Management page still prefers the higher-level profile contract, which is fine; the lower-level master route is now available for deeper admin/use cases.
- Material master still lacks persisted-first master-specific revisioning/workflow beyond the underlying materials table.
