# BRANCH PROGRESS — Supplier Master Profile Item Bridge (2026-04-21)

## Scope
Next increment after supplier master workflowization:
- add unified `/api/config/profiles/supplier_master/items/*` routes
- shift supplier master front-end CRUD toward the profile bridge
- reduce the semantic split between `masters` and `profiles`

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Add supplier master item bridge routes
- [x] Switch supplier master front-end API/page to prefer the bridge
- [x] Add regression coverage
- [x] Run targeted verification and update progress docs

## Implementation progress
- Added `/api/config/profiles/supplier_master/items`, `POST`, `PUT`, and `archive` item routes to the unified profile bridge.
- Updated `supplierMasterProfileApi` and the supplier master page state to prefer the profile-item bridge over lower-level master routes.
- Supplier master now has collection detail + item CRUD under the same unified profile namespace.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/supplier-master-profile-api.test.ts tests/config-profile-routes.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Supplier master still lacks revision/publish workflow.
- The lower-level `/config/masters/suppliers*` routes still exist for compatibility/utility.
