# Changelog

All notable changes to this project will be documented in this file.

## [1.1.3] - 2026-03-19

### Changed
- Migrated all 49 server JavaScript files to TypeScript (`.js` → `.ts`) with strict type checking enabled
- Migrated full test suite (89 test files) from `.js` to `.ts` with type-safe imports
- Restored typed return signatures across three repository layers (`formula.repository.ts`, `order.repository.ts`, `inventory-receipt.repository.ts`) — eliminating 30 degraded `any` returns via `ModelInstance<A, C>` intersection types
- Removed 13 CJS `module.exports` shims from TypeScript server files; test harness updated with `.default` unwrap for ESM-via-CJS routes
- Eliminated all 62 `as any` casts across the server codebase — replaced with `ModelInstance`, `RouterLike`, `FormulaWorkflowResult`, and inline type guards

### Fixed
- Race condition in `ContractCacheService.cacheContract()`: concurrent inserts now caught via `UniqueConstraintError` and retried with update, preventing duplicate constraint errors
- `PDF_DEBUG` env flag inverted logic fixed: debug mode now activates on `PDF_DEBUG === '1'` (was `!== '0'`)
- `importMaterials.ts` script: removed bare `process.exit(0)` and added `sequelize.close()` in `.finally()` to prevent connection leak
- `tsconfig.server.json` `rootDir` aligned to include `server/scripts/` directory
- Added `tsconfig.test.json` with `tsx` path alias and correct test root for the test runner

### Removed
- All server-side `.js` source files replaced by their `.ts` equivalents
- `module.exports` CJS shims that were used as interop bridges during migration
