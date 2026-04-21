# BRANCH PROGRESS — Config Platform Profile Bridge (2026-04-21)

## Scope
Next roadmap increment after runtime snapshot unification:
- introduce a unified backend config profile surface
- keep existing mappings/materials/formulas workflows as the underlying source of truth
- expose normalized `/api/config/profiles/:code/*` routes as a compatibility-stable bridge toward the target platform shape

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect workflow service contracts and normalize target shape
- [x] Lock behavior with regression tests
- [x] Implement profile registry/service and unified routes
- [x] Run targeted verification

## Notes
- This increment focuses on backend protocol unification, not front-end migration.
- Legacy and existing workflow endpoints remain mounted during this phase.

## Implementation progress
- Added normalized config profile types, registry, and bridge service under `server/services/config-platform/`.
- Added unified bridge routes in `server/routes/configProfiles.ts` and mounted them under `server/routes/index.ts` at `/api/config/profiles`.
- Mappings and material catalog now expose a shared profile-shaped workflow surface; formulas are included as a read-only collection profile with unsupported singleton write actions returning 405.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`
- Passed: `npm run type-check:server`
- Passed: `npm run type-check`

## Remaining roadmap gaps
- Frontend config editors are not yet migrated to consume `/api/config/profiles` directly.
- Formulas are only exposed as a read-only collection profile in this bridge; full write-side protocol unification still requires a dedicated collection-aware abstraction.
- Legacy `/api/config/*` compatibility routes remain mounted by design in this phase.
