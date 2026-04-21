# BRANCH PROGRESS — Config Profile Impact Summary (2026-04-21)

## Scope
Next increment after diff support:
- add a minimal impact-summary API for singleton profiles
- derive impact counts and top changed paths from existing diff data
- render a simple impact summary in the shared profile host

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Define impact summary contract
- [x] Implement backend impact summary support
- [x] Wire front-end impact summary into shared host
- [x] Add regression coverage and verify

## Notes
- This increment is intentionally lightweight and does not yet simulate source-order replay.
- Collection profiles remain unsupported initially, matching the current diff support boundaries.

## Implementation progress
- Added `server/services/config-platform/profile.impact.ts` and `GET /api/config/profiles/:code/impact`.
- Added `mappingConfigApi.loadWorkflowImpact()` and front-end impact state in `useProfileEditor()`.
- `ProfileEditorHost` now renders a minimal impact summary panel with counts and top changed paths.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/mapping-config-api.test.ts tests/config-table-guard.test.ts tests/config-profile-routes.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Impact summary is currently diff-derived only and does not yet run sample replay or source-order simulation.
- Collection-profile impact remains unsupported.
- No dedicated front-end impact drill-down UX exists yet beyond the host summary card.
