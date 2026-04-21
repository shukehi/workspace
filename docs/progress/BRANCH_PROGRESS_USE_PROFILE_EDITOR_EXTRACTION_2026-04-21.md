# BRANCH PROGRESS — useProfileEditor Extraction (2026-04-21)

## Scope
Next increment after frontend profile bridge adoption:
- generalize config editor workflow orchestration from `useMappingConfigEditor` to `useProfileEditor`
- keep the old composable name as a compatibility surface during migration
- move current config pages onto the generic entry point

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect current composable usage and define compatibility path
- [x] Implement `useProfileEditor`
- [x] Migrate current config pages to the generic composable import
- [x] Run targeted verification

## Notes
- This is an internal refactor with no intended protocol change.
- The old composable name should remain valid until later cleanup passes.

## Implementation progress
- Added `src/features/config-editor/composables/useProfileEditor.ts` as the generalized workflow orchestrator.
- Reduced `useMappingConfigEditor.ts` to a compatibility shim that re-exports the generic composable.
- Migrated current config views to import and call `useProfileEditor` directly.

## Verification
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/mapping-config-api.test.ts tests/config-profile-routes.test.ts tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`

## Remaining roadmap gaps
- The config page shell is still `ConfigPageLayout`; a more explicit `ConfigCenterShell` split has not yet been introduced.
- Formula management UI has not yet been migrated to a collection-aware generic profile editor.
- Legacy shim `useMappingConfigEditor` is intentionally retained for compatibility and later cleanup.

## Shell alignment progress
- Added `src/features/config-editor/components/ConfigCenterShell.vue` as the generic top-level platform shell.
- Added `src/features/config-editor/components/ProfileEditorHost.vue` as the editor-oriented host that owns workflow meta, issues, JSON dialog, and action bars.
- Reduced `ConfigPageLayout.vue` to a compatibility wrapper over `ProfileEditorHost`.
- Wrapped `src/views/ColorFormula.vue` in `ConfigCenterShell` to align formula management with the same platform framing.

## Verification
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts tests/mapping-config-api.test.ts tests/config-profile-routes.test.ts tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`

## Remaining roadmap gaps
- Formula UI is only shell-aligned; it still uses dedicated workflow logic rather than a collection-aware generic profile host.
- There is not yet a dedicated `FormulaProfileHost` / collection editor abstraction.
- Legacy `ConfigPageLayout` wrapper remains intentionally for compatibility.
