# BRANCH PROGRESS — Schema-Native Reference Check (2026-04-21)

## Scope
Next increment after the first reference-check surface:
- replace heuristic recursive reference extraction with profile-aware extraction rules
- keep the same HTTP contract while making supplier/material detection more trustworthy
- cover the most important singleton and collection profiles explicitly

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect current generic reference-check implementation and payload shapes
- [x] Implement profile-specific reference extractors
- [x] Add regression tests for profile-aware extraction
- [x] Run targeted verification and update progress docs

## Notes
- This pass focuses on extraction correctness, not UI redesign.
- The output shape of `/api/config/profiles/:code/reference-check` should remain stable.

## Implementation progress
- Replaced the recursive generic extractor with explicit profile-aware extractors for packaging, cylinder, lock, handle, lock_fork, material_catalog, and formulas.
- Packaging now extracts only `supplierName`; formulas now extract `bom[].supplier` and `bom[].materialId`; handle/lock/cylinder/lock_fork use their schema-specific fields.
- The `/api/config/profiles/:code/reference-check` response shape stays the same while extraction is now schema-native.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Extraction is profile-aware but still hand-written, not yet generated from a formal schema contract.
- The front-end currently shows summary-level reference issues only; no field-level highlighting exists yet.
