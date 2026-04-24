# PR Note — Config Center Simplification Wave1 (2026-04-24)

Target branch suggestion: `integration/config-center-simplification-wave1`

## Summary

- Change type: `refactor`
- Scope: config center simplification wave1 integration
- Main files changed:
  - `src/views/PackagingConfig.vue`
  - `src/views/LockConfig.vue`
  - `src/views/HandleConfig.vue`
  - `src/views/CylinderConfig.vue`
  - `src/views/LockForkConfig.vue`
  - `src/features/config-editor/utils/packagingEditorState.ts`
  - `src/features/config-editor/utils/lockEditorState.ts`
  - `src/features/config-editor/utils/handleEditorState.ts`
  - `src/features/config-editor/utils/cylinderEditorState.ts`
  - `src/features/config-editor/utils/lockEditorValidation.ts`
  - `src/types/mapping.ts`
  - `src/services/mappings/mappingAdapter.ts`
  - `shared/mappings/mapping-adapter-core.js`
  - related guard / editor-state / parity / loader tests
- Related roadmap / governance doc:
  - `.omx/plans/prd-config-center-simplification.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_PATTERN_GUIDE_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_MERGE_RUNBOOK_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_REVIEW_CHECKLIST_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_CHANGESET_MAP_2026-04-24.md`

### One-paragraph summary
This PR integrates the first wave of config-center simplification work into one reviewable branch. The wave applies a consistent “system defaults + explicit exceptions” editing pattern to packaging, lock, handle, and the mappings/exclusions slice of cylinder, while aligning lock-fork supplier editing and contract semantics to the real `suppliers.default` runtime boundary. It also closes a real lock JSON-apply silent-drop bug, adds/updates the relevant guard and editor-state regressions, and carries forward the pattern/merge/review documentation needed to review and integrate the wave cleanly.

## Risk & Impact

- User-facing impact: `Yes`
  - affected config pages become more exception-oriented and less noisy on first load
- API contract impact: `Yes`
  - lock-fork frontend/editor contract is explicitly narrowed to the already-real `suppliers.default` shape
- Request validation impact: `Yes`
  - lock JSON apply path now surfaces missing `supplier` / `vendorName` instead of silently dropping rows
- Database schema impact: `No`
- Browser/runtime side-effect boundary touched: `No`
- Legacy / compatibility entry touched: `No`
- Backward compatibility strategy:
  - packaging / lock / handle / cylinder trials keep their existing runtime contract shapes
  - lock-fork UI now matches the already-existing runtime contract instead of advertising broader behavior
- Legacy / compatibility retirement plan:
  - not part of this PR; no legacy compatibility surface is widened

## Validation

- [x] `npm run lint:css`
- [x] `node --require tsx/cjs --test tests/print-style-guard.test.ts`
- [x] `npm run type-check`
- [x] Targeted wave1 regression set:
  - `tests/config-table-guard.test.ts`
  - `tests/packaging-editor-state.test.ts`
  - `tests/lock-config-playground-guard.test.ts`
  - `tests/lock-editor-state.test.ts`
  - `tests/lock-editor-validation.test.ts`
  - `tests/handle-editor-state.test.ts`
  - `tests/cylinder-config-playground-guard.test.ts`
  - `tests/cylinder-editor-state.test.ts`
  - `tests/cylinder-excluded-validator.test.ts`
  - `tests/lock-fork-config-playground-guard.test.ts`
  - `tests/mapping-validator.test.ts`
  - `tests/mapping-server-validator.test.ts`
  - `tests/mapping-rules-adapter.test.ts`
  - `tests/shared-mapping-core.test.ts`
  - `tests/mappings/mapping-parity.test.ts`
  - `tests/config-loader-mapping.test.ts`
- [x] `npm run build`
- [ ] `npm test` (not run for this PR; repository-wide unrelated historical failures remain outside wave1 scope)
- [ ] Manual verification completed for affected pages
- [ ] Request validation / error response shape verified for affected write APIs
- [x] Added or updated guard / structure tests when introducing new boundary rules

## Rollback Plan

- Revert commit(s):
  - if rolling back the whole wave, revert the integrated wave1 commits from `513fdcc` through `4229756` as needed
  - if rolling back by slice, revert the relevant module-specific commits independently
- Data rollback required: `No`
- Operational notes:
  - this wave is frontend/editor focused plus contract alignment; no DB migration rollback required
  - lock-fork contract alignment revert should restore both TS/defaults and shared JS adapter together
- Rollback verification steps:
  - rerun `npm run type-check`
  - rerun `npm run lint:css`
  - rerun `node --require tsx/cjs --test tests/print-style-guard.test.ts`
  - rerun the targeted wave1 regression set
  - rerun `npm run build`

## Reviewer checklist

### Highest priority review points
1. Packaging / Lock / Handle / Cylinder / LockFork pages all follow the intended “system defaults + explicit exceptions” model
2. Lock table editing and JSON apply no longer silently lose model-only mappings
3. Lock-fork only exposes/supports `suppliers.default` end-to-end
4. Page-local draft-row helpers do not conflict with each other after integration

### Reviewer reading order
1. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
2. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_REVIEW_CHECKLIST_2026-04-24.md`
3. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_CHANGESET_MAP_2026-04-24.md`
4. `src/views/PackagingConfig.vue`
5. `src/views/LockConfig.vue`
6. `src/views/HandleConfig.vue`
7. `src/views/CylinderConfig.vue`
8. `src/views/LockForkConfig.vue`
9. contract alignment files:
   - `src/types/mapping.ts`
   - `src/services/mappings/mappingAdapter.ts`
   - `shared/mappings/mapping-adapter-core.js`
   - `src/features/config-editor/utils/lockEditorValidation.ts`

## Known non-blocking follow-ups
- shared `.js` / `.mjs` adapter dual-entry drift risk still exists as a future cleanup item
- handle `useSystemDefaultStrategy` is still UI state, not fully derived state
- packaging backend dictionary/default ownership shift is still a future phase, not included in wave1

## Copy-ready PR body

```md
## Summary

- Change type: `refactor`
- Scope: config center simplification wave1 integration
- Main files changed:
  - `src/views/PackagingConfig.vue`
  - `src/views/LockConfig.vue`
  - `src/views/HandleConfig.vue`
  - `src/views/CylinderConfig.vue`
  - `src/views/LockForkConfig.vue`
  - `src/features/config-editor/utils/*EditorState.ts`
  - `src/features/config-editor/utils/lockEditorValidation.ts`
  - `src/types/mapping.ts`
  - `src/services/mappings/mappingAdapter.ts`
  - `shared/mappings/mapping-adapter-core.js`
  - related guard / editor-state / parity / loader tests
- Related roadmap / governance doc:
  - `.omx/plans/prd-config-center-simplification.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_PATTERN_GUIDE_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_MERGE_RUNBOOK_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
  - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_REVIEW_CHECKLIST_2026-04-24.md`

## Risk & Impact

- User-facing impact: `Yes`
- API contract impact: `Yes` (lock-fork supplier contract is explicitly aligned to `suppliers.default`)
- Request validation impact: `Yes` (lock JSON apply now blocks silent-drop cases)
- Database schema impact: `No`
- Browser/runtime side-effect boundary touched: `No`
- Legacy / compatibility entry touched: `No`
- Backward compatibility strategy:
  - packaging / lock / handle / cylinder keep their existing runtime contract shapes
  - lock-fork UI now matches the already-real runtime contract instead of implying broader support
- Legacy / compatibility retirement plan:
  - not part of this PR

## Validation

- [ ] `npm run lint:css`
- [x] `npm run type-check`
- [x] Targeted wave1 regression set completed
- [x] `npm run build`
- [ ] `npm test` (not run; repository-wide unrelated historical failures remain outside wave1 scope)
- [ ] Manual verification completed for affected pages
- [ ] Request validation / error response shape verified for affected write APIs
- [x] Added or updated guard / structure tests when introducing new boundary rules

## Rollback Plan

- Revert commit(s): revert the integrated wave1 commits as a set or per-slice as needed
- Data rollback required: `No`
- Operational notes:
  - no DB migration rollback required
  - lock-fork contract alignment should be reverted as a coordinated unit if rolled back
- Rollback verification steps:
  - rerun `npm run type-check`
  - rerun targeted wave1 regression set
  - rerun `npm run build`

## Checklist

- [x] Followed `docs/governance/ENGINEERING_CONVENTIONS.md`
- [x] Followed `docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
- [x] Cross-checked `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`
- [x] New code does not depend on legacy `/api/config/*` compatibility routes unless explicitly justified
- [x] Any compatibility shell remains forwarding-only and has a documented retirement path
- [x] Page/store boundaries remain clear; no new "big page" or "big store" introduced
- [x] Browser-side effects were not pushed deeper into core store / manager layers
- [x] Fallback logic stays inside repository/facade layers, not in pages/components
- [x] Affected write APIs have a clear request validation boundary; no new raw request passthrough added
- [x] Error response shape remains consistent for touched endpoints, or the contract delta is explicitly documented
- [x] Updated docs if behavior/contract changed
- [x] Added/updated tests or explained why not needed
```
