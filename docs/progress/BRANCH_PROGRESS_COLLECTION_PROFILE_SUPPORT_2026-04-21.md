# BRANCH PROGRESS — Collection Profile Support (2026-04-21)

## Scope
Next increment after singleton profile maturity:
- add minimal diff/impact/replay support for collection profiles
- start with the formulas profile
- keep semantics lightweight and explicit

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Define formulas collection diff/impact/replay semantics
- [x] Implement collection-aware formulas handling
- [x] Add regression tests
- [x] Run targeted verification and update progress docs

## Notes
- This pass focuses on formulas only.
- Collection support will remain minimal and summary-oriented, not a full per-item diff UI.

## Implementation progress
- Added `server/services/config-platform/formulas.collection.ts` to compute the current formulas working map and published formulas map.
- `profile.diff`, `profile.impact`, and `profile.replay` now special-case `formulas` as a collection profile instead of rejecting it.
- Formulas collection replay compares published formulas vs current working formulas (published + draft, excluding archived) against sample orders.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Front-end collection profile hosts still do not visualize formulas diff/impact/replay specifically.
- Collection support is formulas-only; no generic collection-profile abstraction exists yet.
