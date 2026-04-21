# BRANCH PROGRESS — Config Center Runtime Snapshot (2026-04-21)

## Scope
Phase 1 execution of the config-center refactor plan:
- introduce a unified runtime config snapshot endpoint
- switch frontend bootstrap to prefer the snapshot
- keep behavior stable via regression tests and fallback compatibility

## Checklist
- [x] Create execution/progress artifact for this phase
- [x] Inspect backend/frontend integration points for runtime snapshot
- [x] Lock behavior with regression tests
- [x] Implement backend runtime snapshot route/service
- [x] Update frontend config loading to prefer snapshot
- [x] Run targeted verification

## Notes
- This phase intentionally avoids rewriting config pages.
- Legacy config workflow endpoints remain in place.
- The immediate goal is to unify runtime **read** behavior before unifying all config **write** workflows.

## Integration points confirmed
- Backend route aggregation currently flows through `server/routes/index.ts` and `server/routes/api.ts`.
- Runtime config consumers are centered on `src/services/configLoader.ts`, `src/services/configRepository.ts`, and `src/main.ts`.
- Existing regression coverage is concentrated in `tests/config-loader-mapping.test.ts`, `tests/config-routes.test.ts`, and `tests/main-bootstrap.test.ts`.

## Regression lock results
- Added loader regression cases for runtime snapshot preference and fallback in `tests/config-loader-mapping.test.ts`.
- Added HTTP contract test for `GET /api/runtime/config-snapshot` in `tests/runtime-config-route.test.ts`.
- Verified the new tests fail against current code because the snapshot route and loader support do not exist yet.

## Implementation progress
- Backend: added `server/services/config-platform/profile.snapshot.ts` and `server/routes/runtimeConfig.ts`, then registered the route under `server/routes/api.ts`.
- Frontend: extended `src/services/configRepository.ts` with `readRuntimeSnapshot()` and updated `src/services/configLoader.ts` so `loadAll()` prefers snapshot and falls back to granular reads.
- Targeted verification passed for the new backend route and loader behavior.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`
- Passed: `npm run type-check:server`
- Passed: `npm run type-check`
- Known unrelated baseline issue: `npm run type-check:test` still fails in many pre-existing test files outside this phase; one new local test typing issue was fixed during this pass.
