# BRANCH PROGRESS — Config Repository Profile Detail Migration (2026-04-21)

## Scope
Next runtime-read cleanup increment:
- migrate material catalog and mapping fallback reads in `configRepository` from legacy workflow endpoints to unified `/api/config/profiles/:code/detail`
- keep legacy and static fallbacks only where still necessary for compatibility

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Refactor material catalog and mapping reads to profile detail
- [x] Update regression/source-guard coverage
- [x] Run targeted verification

## Notes
- Runtime snapshot remains the primary read path.
- This increment cleans only the non-snapshot fallback path.

## Implementation progress
- `configRepository.readMaterials()` now reads `/api/config/profiles/material_catalog/detail` and extracts `detail.publishedPayload`.
- `configRepository.readMapping()` now reads `/api/config/profiles/:code/detail` and extracts `detail.publishedPayload`.
- `configRepository.readFormulas()` had already been migrated to `/api/config/profiles/formulas/detail`, so runtime fallback reads are now fully profile-detail based.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-loader-mapping.test.ts tests/config-endpoint-source-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Legacy workflow published endpoints still exist server-side for compatibility, though front-end runtime no longer depends on them.
- Static JSON fallback for materials remains intentionally as the last-resort compatibility path.
