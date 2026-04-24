# Config Center Simplification Wave1 — Review Ready (2026-04-24)

Branch: `integration/config-center-simplification-wave1`

## What this branch contains
This branch is the first integrated wave of the config-center simplification program. It combines the validated module trials plus the follow-up correctness/contract fixes that were identified during those trials.

Integrated slices:
- Packaging simplification stack
  - `513fdcc` / `b00a32d` / `8f18ff9`
- Lock simplification + JSON safety fix
  - `a765bae` / `0fb235f`
- Handle simplification
  - `81735a8`
- Cylinder mappings/exclusions simplification
  - `405019a`
- LockFork UI + contract alignment
  - `7e045c0` / `5a39b9c`
- Documentation carried into wave1
  - `9f93256`
  - `d180552`
  - `e41f223`

## What was intentionally *not* done in wave1
- No broad shared-composable rewrite of `useEditableList`
- No runtime/business-rule redesign for lock / handle / cylinder / lockfork
- No backend dictionary ownership shift yet
- No broad merge of trial branches; the branch was assembled by curated cherry-pick

## Proven wave1 patterns
1. **System defaults + explicit exception rows**
2. **Page-local draft-row gating instead of risky shared list rewrites**
3. **Contract-aligned UI** — especially for lockfork `suppliers.default`
4. **Early validation to stop silent data loss** — especially on lock JSON apply

## High-value fixes already included
### Lock JSON apply no longer silently drops invalid model-only mappings
- Protected by local raw-payload validation before adaptation
- Files:
  - `src/features/config-editor/utils/lockEditorValidation.ts`
  - `src/views/LockConfig.vue`

### LockFork supplier contract aligned end-to-end
- Type contract narrowed to `suppliers.default`
- UI, adapter, validator, runtime now tell the same story
- Files:
  - `src/types/mapping.ts`
  - `src/services/mappings/mappingAdapter.ts`
  - `shared/mappings/mapping-adapter-core.js`
  - `src/views/LockForkConfig.vue`

## Review focus for wave1
### 1. UX consistency
Check that these pages now read as “system defaults + exception maintenance” rather than full-table config editors:
- `src/views/PackagingConfig.vue`
- `src/views/LockConfig.vue`
- `src/views/HandleConfig.vue`
- `src/views/CylinderConfig.vue`
- `src/views/LockForkConfig.vue`

### 2. Contract safety
Check especially:
- lock JSON apply path does not silently lose rows
- lockfork only exposes and persists `suppliers.default`
- no page claims capabilities the contract/runtime does not support

### 3. Shared helper drift risk
Watch but do not block wave1 on:
- `.js` / `.mjs` shared adapter duplication still existing in the repo
- UI-only default mode flags that are not always fully derived from fields

## Verification evidence on wave1 branch
Latest successful checks run on this branch:
- `npm run type-check`
- `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts tests/packaging-editor-state.test.ts tests/lock-config-playground-guard.test.ts tests/lock-editor-state.test.ts tests/lock-editor-validation.test.ts tests/handle-editor-state.test.ts tests/cylinder-config-playground-guard.test.ts tests/cylinder-editor-state.test.ts tests/cylinder-excluded-validator.test.ts tests/lock-fork-config-playground-guard.test.ts tests/mapping-validator.test.ts tests/mapping-server-validator.test.ts tests/mapping-rules-adapter.test.ts tests/shared-mapping-core.test.ts tests/mappings/mapping-parity.test.ts tests/config-loader-mapping.test.ts`
- `npm run build`

## Architect verdict
Integrated branch review status: **APPROVED**

Key architect conclusion:
- This branch is a sound wave1 integration target
- Scope is constrained and internally coherent
- The branch resolves the most important UI/contract drift discovered in the trials

## Recommended next move after review
Choose one:
1. **Open/review PR for wave1 integration**
2. **Start wave2 shared-alignment cleanup**
   - focus on `.js` / `.mjs` shared adapter drift
3. **Start packaging runtime/backend ownership shift**
   - first real backend default/dictionary phase
