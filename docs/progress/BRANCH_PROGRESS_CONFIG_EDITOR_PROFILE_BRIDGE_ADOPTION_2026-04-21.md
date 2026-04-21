# BRANCH PROGRESS — Config Editor Profile Bridge Adoption (2026-04-21)

## Scope
Next increment after introducing backend `/api/config/profiles` routes:
- migrate front-end config editors to consume the unified profile workflow shape
- preserve backward compatibility while switching default base paths to the profile bridge
- avoid touching formula UI in this increment

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect front-end workflow API parsing and endpoint constants
- [x] Lock behavior with regression tests
- [x] Switch config editor workflow base paths to `/config/profiles`
- [x] Run targeted verification

## Notes
- Formula management remains on its dedicated workflow surface for now.
- This increment focuses on packaging/cylinder/lock/handle/lock_fork/material_catalog editors.

## Implementation progress
- Updated `src/services/mappingConfigApi.ts` so workflow loading understands the unified `detail` response shape and defaults to `/config/profiles`.
- Updated `src/shared/constants/endpoints.ts` to route packaging/cylinder/lock/handle/lock_fork/material_catalog editors through the profile bridge.
- Made profile bridge usage explicit in the individual config views via `workflowBasePath`.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/mapping-config-api.test.ts tests/config-profile-routes.test.ts tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Formula management UI is still on its dedicated workflow surface and has not been migrated to a collection-aware unified profile editor.
- `useMappingConfigEditor` still uses the old name and has not yet been generalized into a true `useProfileEditor` shell.
- Legacy config write endpoints remain mounted for compatibility.
