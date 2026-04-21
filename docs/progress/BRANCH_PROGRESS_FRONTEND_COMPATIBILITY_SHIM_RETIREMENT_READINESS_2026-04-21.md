# BRANCH PROGRESS — Frontend Compatibility Shim Retirement Readiness (2026-04-21)

## Scope
Cleanup increment after profile/platform migration:
- confirm whether legacy front-end shim surfaces still have real consumers
- mark shim-only files explicitly as compatibility wrappers
- add guard coverage so those files do not regain new production consumers

## Checklist
- [x] Inspect current shim consumers
- [x] Add explicit retirement-readiness markers/comments
- [x] Add/update guard coverage for zero-runtime-consumer status
- [x] Run targeted verification and update progress docs

## Findings
- `formulaApi` has no remaining production consumers in `src/**`; only compatibility tests reference it.
- `useMappingConfigEditor` has no remaining production consumers beyond the shim file itself.
- `ConfigPageLayout` is no longer imported by production view/feature code and remains as a compatibility wrapper only.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-endpoint-source-guard.test.ts tests/formula-api-compatibility.test.ts`
- Passed: `npm run type-check`

## Remaining roadmap gaps
- These shims are retirement-ready but not yet physically removed.
- Server-side legacy routes remain mounted and only marked for deprecation.
