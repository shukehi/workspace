# BRANCH PROGRESS — Supplier Master Skeleton (2026-04-21)

## Scope
Next increment after config platform consolidation:
- introduce a minimal read-only supplier master aggregation surface
- prepare a first reference-check path so rules can validate supplier/material references against a master view
- keep current business semantics unchanged while starting main-data explicitization

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect supplier sources across materials and mapping configs
- [x] Implement supplier master aggregation service and read route
- [x] Add lightweight config reference-check support
- [x] Run targeted verification and update progress docs

## Notes
- This pass does not create a full supplier CRUD workflow yet.
- The initial master can be derived/aggregated from existing data sources as a stepping stone.

## Implementation progress
- Added `server/services/config-platform/supplier-master.ts` to aggregate supplier master entries from material master plus available config payloads.
- Added `server/services/config-platform/profile.reference-check.ts` to extract supplier/material refs from config payloads and compare them against material/supplier master views.
- Added routes: `/api/config/masters/suppliers` and `/api/config/profiles/:code/reference-check`.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Supplier master is still aggregated/read-only, not a true managed master-data workflow.
- Reference-check is heuristic and payload-shape driven, not schema-native per profile yet.
- Front-end does not yet surface supplier master or reference-check results.

## Front-end host wiring
- Added `mappingConfigApi.loadWorkflowReferenceCheck()` and `loadSupplierMaster()`.
- Added reference-check and supplier-master state to `useProfileEditor()`.
- `ProfileEditorHost` now renders a minimal “主数据引用检查” summary card.

## Front-end verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/mapping-config-api.test.ts tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`
