# BRANCH PROGRESS — Material Supplier Link UI (2026-04-21)

## Scope
Next increment after backend material-to-supplier link introduction:
- expose `supplier_master_id` visibly in the material master UI
- make linkage status observable to users/operators
- keep this pass lightweight and read-oriented

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Carry `supplier_master_id` through front-end types/APIs
- [x] Render linkage status in Material Management UI
- [x] Add/update regression guards
- [x] Run targeted verification and update progress docs

## Implementation progress
- Material master front-end types now carry `supplier_master_id`.
- Material Management UI now shows supplier master linkage status in both the table and edit dialog context.
- This makes the new persisted material→supplier link observable to operators, not just stored in the backend.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts tests/material-management-page-state.test.ts tests/material-master-profile-api.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Joined supplier detail
- Material reads now include joined `supplierMaster` detail, so the UI can show linked supplier master name/status instead of only the foreign-key id.
