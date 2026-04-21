# BRANCH PROGRESS — Reference Check Detail Enrichment (2026-04-21)

## Scope
Next increment after schema-native reference-check:
- enrich reference-check output with per-reference detail and source paths
- preserve backward-compatible summary fields
- expose a minimal detail list in the shared front-end host

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Extend extractors to emit path-aware reference entries
- [x] Return enriched detail from backend reference-check API
- [x] Surface minimal detail list in the front-end host
- [x] Add regression coverage, run verification, and update progress docs

## Implementation progress
- Reference extractors now emit `supplierRefItems` and `materialCodeRefItems` with explicit `path` and `value`.
- Backend `/reference-check` responses remain backward-compatible while adding path-aware detail and per-entry missing-master flags.
- `ProfileEditorHost` now renders minimal path lists for supplier and material references.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`
