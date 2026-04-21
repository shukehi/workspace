# BRANCH PROGRESS — Config Center Post-Save Runtime Refresh (2026-04-21)

## Scope
Second increment after runtime snapshot introduction:
- unify post-save runtime refresh to prefer the runtime snapshot
- keep existing page-level save flows working via fallback behavior
- avoid reintroducing per-profile drift after save

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect save-time runtime refresh flow
- [x] Lock behavior with regression tests
- [x] Implement snapshot-aware post-save refresh path
- [x] Run targeted verification

## Notes
- This increment does not yet remove profile-specific refresh APIs.
- The immediate goal is to change the **default refresh path after save**, not to delete compatibility helpers.

## Implementation progress
- Confirmed `useMappingConfigEditor.save()` refreshes runtime via page-injected `refreshRuntime()` callbacks.
- Updated `ConfigLoaderService` refresh methods so they all attempt runtime snapshot first and fall back to granular profile refreshes.
- This keeps page save flows unchanged while switching the default refresh behavior to snapshot-aware reads.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-loader-mapping.test.ts tests/runtime-config-route.test.ts tests/main-bootstrap.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining notes
- Config pages still pass page-specific refresh callbacks, but those callbacks are now snapshot-aware through `ConfigLoaderService`.
- Legacy per-profile refresh helper names are retained for compatibility; cleanup can happen in a later phase.
