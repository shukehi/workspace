# BRANCH PROGRESS — Config Profile Sample Replay (2026-04-21)

## Scope
Next increment after diff + impact summary:
- add a minimal sample replay / impact simulation backend surface
- reuse existing source-analysis / contract-cache building blocks where feasible
- keep unsupported boundaries explicit while establishing the contract shape for later deeper replay

## Checklist
- [x] Create execution/progress artifact for this increment
- [x] Inspect source-order analysis services and available runtime data/fixtures
- [x] Define minimal replay contract and support boundaries
- [x] Implement backend replay endpoint and minimal summary
- [x] Add regression coverage, verify, and update progress docs

## Notes
- This pass prioritizes a stable contract and minimal observable behavior over full-fidelity replay.
- If true source-order simulation is not yet safely reusable for a profile, the endpoint should say so explicitly instead of guessing.

## Implementation progress
- Added `server/services/config-platform/profile.replay.ts` and `GET /api/config/profiles/:code/replay`.
- Replay uses stable bundled fixture samples plus the existing pure `analyzeSourceOrder()` function to compare published vs draft-overridden configs.
- Snapshot availability is best-effort: replay falls back to an empty baseline plus current published/draft payloads when a complete runtime snapshot cannot be built.
- Front-end host now loads and displays a minimal replay summary card via `mappingConfigApi.loadWorkflowReplay()` and `useProfileEditor()`.

## Verification
- Passed: `node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts tests/mapping-config-api.test.ts tests/config-table-guard.test.ts`
- Passed: `npm run type-check`
- Passed: `npm run type-check:server`

## Remaining roadmap gaps
- Replay is fixture-based and best-effort, not yet driven by real recent source-order samples from contract cache.
- Replay for collection profiles remains unsupported.
- There is no front-end drill-down viewer for per-sample before/after details yet.

## Replay source upgrade
- Replay now prefers recent `erp_contracts.raw_json` samples when available and falls back to bundled fixture samples otherwise.
- Verified with `tests/config-profile-routes.test.ts` that packaging replay reports `sampleSource: contract-cache` when a recent cached contract exists.
