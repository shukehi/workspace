# BRANCH PROGRESS — Profile Diff Viewer Wiring (2026-04-21)

## Scope
Next increment after backend diff support:
- wire singleton profile diff loading into the front-end editor layer
- render a minimal diff panel in the shared profile host
- keep formulas/collection profiles explicitly unsupported for now

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Design front-end diff state/load path
- [x] Implement API support and shell rendering
- [x] Add/update regression coverage
- [x] Run targeted verification

## Notes
- This pass focuses on minimal visibility, not a polished diff UX.
- The first goal is to make backend diff data observable in the shared host.

## Implementation progress
- Added `mappingConfigApi.loadWorkflowDiff()` and editor-layer diff state in `useProfileEditor()`.
- Added a minimal diff card to `ProfileEditorHost` for singleton profiles.
- Diff now shows path-level structural changes between draft and published payloads.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/mapping-config-api.test.ts tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- There is no dedicated diff viewer UX yet beyond the minimal host card.
- Collection-profile diff remains unsupported.
- No impact or replay pipeline consumes diff data yet.
