# BRANCH PROGRESS — Config Profile Diff Support (2026-04-21)

## Scope
Next roadmap increment:
- add minimal diff support to unified config profile routes
- compare draft vs published payloads for singleton profiles
- explicitly reject unsupported collection-profile diff requests for now

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Define diff response shape
- [x] Implement backend diff support
- [x] Add regression tests for supported/unsupported diff behavior
- [x] Run targeted verification

## Notes
- This pass focuses on backend diff data, not yet on a front-end diff viewer.
- Initial scope is singleton profiles only.

## Implementation progress
- Added `server/services/config-platform/profile.diff.ts` with a minimal path-based structural diff (`added` / `removed` / `changed`).
- Added `GET /api/config/profiles/:code/diff` to `configProfiles` routes.
- Singleton profiles now return draft-vs-published diffs; collection profiles such as formulas explicitly return `405 unsupported`.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- No front-end diff viewer consumes this endpoint yet.
- Collection-profile diff is still unsupported.
- Impact/replay analysis remains unimplemented.
