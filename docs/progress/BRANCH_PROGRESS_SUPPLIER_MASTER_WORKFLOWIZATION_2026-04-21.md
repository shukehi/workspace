# BRANCH PROGRESS — Supplier Master Workflowization (2026-04-21)

## Scope
Next increment after supplier master read-only exposure:
- introduce a persisted supplier master model as a first-class config-domain object
- keep the current aggregated supplier view as fallback/seed input
- expose a minimal read-only workflow/detail contract as groundwork for future CRUD/publish

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect model/migration patterns for a safe supplier master addition
- [x] Implement supplier master model + migration + read workflow
- [x] Adapt supplier master API/page to prefer persisted entries with aggregate fallback
- [x] Add regression tests, run verification, and update progress docs

## Notes
- This pass is intentionally read-oriented; full edit/publish workflow can follow later.
- The immediate goal is to create a persistent master-data anchor, not to finish supplier governance in one step.

## Implementation progress
- Added persisted model `server/models/SupplierMaster.ts` plus migration `20260421-012-add-supplier-master`.
- Supplier master read flow now seeds from the aggregated supplier view when the persisted table is empty, then prefers persisted entries on subsequent reads.
- Added `/api/config/masters/suppliers/detail` as a minimal read-oriented workflow/detail contract.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Supplier master still lacks edit/publish workflow and revision history.
- Source-note persistence is minimal and aggregation-derived rather than operator-managed.

## Unified profile alignment
- Added `supplier_master` to the unified config profile registry as a collection profile.
- `GET /api/config/profiles/supplier_master/detail` now exposes supplier master through the same profile namespace as mappings/material catalog/formulas.
- Verified via `tests/config-profile-routes.test.ts` that supplier master appears in profile listing and detail surfaces.
