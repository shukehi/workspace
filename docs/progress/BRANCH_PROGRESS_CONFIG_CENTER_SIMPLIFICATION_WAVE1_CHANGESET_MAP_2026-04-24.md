# Config Center Simplification Wave1 — Changeset Map (2026-04-24)

Branch: `integration/config-center-simplification-wave1`

## Purpose
给 reviewer 一张“改了什么、为什么改、看哪里”的索引图，避免在 wave1 上逐个翻 commit 才能建立心智模型。

---

## 1. Packaging slice
### Commits
- `513fdcc` — base packaging simplification
- `b00a32d` — empty-state / placeholder-row fix
- `8f18ff9` — add-under-search follow-up

### Main files
- `src/views/PackagingConfig.vue`
- `src/features/config-editor/utils/packagingEditorState.ts`
- `tests/packaging-editor-state.test.ts`
- `tests/config-table-guard.test.ts`

### Reviewer focus
- packaging 页面是否已经是“系统默认 + 例外项”的表达
- 空状态下是否不再默认暴露空白占位行
- 新增例外映射时是否不会出现双空行 / 搜索过滤误隐藏

---

## 2. Lock slice
### Commits
- `a765bae` — lock-first UI simplification
- `0fb235f` — table-editing path bug fix

### Main files
- `src/views/LockConfig.vue`
- `src/features/config-editor/utils/lockEditorState.ts`
- `src/features/config-editor/utils/lockEditorValidation.ts`
- `tests/lock-editor-state.test.ts`
- `tests/lock-editor-validation.test.ts`
- `tests/lock-config-playground-guard.test.ts`
- `tests/config-table-guard.test.ts`

### Reviewer focus
- lock 页面是否正确表达为“系统默认基础策略 + 例外项映射”
- rule playground 是否保持原有能力
- table path 与 JSON apply path 是否都能阻止 model-only row 被静默丢弃

---

## 3. Handle slice
### Commits
- `81735a8` — handle-first simplification

### Main files
- `src/views/HandleConfig.vue`
- `src/features/config-editor/utils/handleEditorState.ts`
- `tests/handle-editor-state.test.ts`
- `tests/config-table-guard.test.ts`

### Reviewer focus
- 基础默认策略是否优先展示系统值
- 型号映射区是否已经是“例外项维护面”
- draft-row gating 是否和 packaging / lock 保持一致

---

## 4. Cylinder slice
### Commits
- `405019a` — mappings/exclusions-only simplification

### Main files
- `src/views/CylinderConfig.vue`
- `src/features/config-editor/utils/cylinderEditorState.ts`
- `tests/cylinder-editor-state.test.ts`
- `tests/cylinder-config-playground-guard.test.ts`
- `tests/cylinder-excluded-validator.test.ts`
- `tests/config-table-guard.test.ts`

### Reviewer focus
- 只看 `mappings` 页签，不要把它误读为全页面大改
- 自定义 LOGO / 排除锁芯 / 型号映射是否都符合“例外项维护面”
- accessory playground、尺寸和规则逻辑是否保持不变

---

## 5. LockFork slice
### Commits
- `7e045c0` — UI contract alignment to `suppliers.default`
- `5a39b9c` — type/default/shared adapter contract alignment

### Main files
- `src/views/LockForkConfig.vue`
- `src/types/mapping.ts`
- `src/services/mappings/mappingAdapter.ts`
- `shared/mappings/mapping-adapter-core.js`
- `tests/mapping-rules-adapter.test.ts`
- `tests/mappings/mapping-parity.test.ts`
- `tests/config-table-guard.test.ts`

### Reviewer focus
- lock-fork suppliers tab 是否已经和真实契约完全一致，只编辑 `default`
- lock-fork 的 type / adapter / runtime 是否都指向同一个 `default-only` 现实
- 不能再把这个页签当成“多键 supplier exception map”看待

---

## 6. Cross-slice docs / review support
### Commits
- `9f93256` — pattern guide
- `d180552` — pattern guide refresh after lock-fork contract cleanup
- `e41f223` — pattern guide refresh after wave1 contract cleanup
- `36ed489` — wave1 review-ready handoff
- `e442599` — wave1 reviewer checklist
- `35808d9` — wave1 PR note
- `9067a40` — wave1 changeset map
- `4229756` — print-style governance command alignment
- `fada06d` — reviewer packet sync after governance-check fix
- `ccf98be` — reviewer packet final sync for current tip

### Main files
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_PATTERN_GUIDE_2026-04-24.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_REVIEW_CHECKLIST_2026-04-24.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_PR_NOTE_2026-04-24.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_CHANGESET_MAP_2026-04-24.md`
- `.github/pull_request_template.md`
- `.github/workflows/css-governance.yml`
- `docs/governance/ENGINEERING_CONVENTIONS.md`
- `docs/governance/CSS_GOVERNANCE_CHECKLIST.md`

### Reviewer focus
- 这些文档应该和当前集成分支状态一致，不再保留已完成事项的 stale note
- review/PR 所依赖的 print-style governance 命令也应该与真实 `.ts` 测试路径一致
- reviewer 可以按：
  1. ready handoff
  2. checklist
  3. changeset map
  4. PR note
  5. pattern guide
  的顺序阅读

---

## 7. Recommended review order
1. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
2. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_REVIEW_CHECKLIST_2026-04-24.md`
3. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_CHANGESET_MAP_2026-04-24.md`
4. `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_PR_NOTE_2026-04-24.md`
5. `src/views/PackagingConfig.vue`
6. `src/views/LockConfig.vue`
7. `src/views/HandleConfig.vue`
8. `src/views/CylinderConfig.vue`
9. `src/views/LockForkConfig.vue`
10. `src/features/config-editor/utils/*EditorState.ts`
11. `src/features/config-editor/utils/lockEditorValidation.ts`
12. `src/types/mapping.ts` + `src/services/mappings/mappingAdapter.ts` + `shared/mappings/mapping-adapter-core.js`

---

## 8. What this map is not
This file is not:
- a merge runbook
- a PR body
- a replacement for tests

It exists only to shorten reviewer orientation time on the integrated branch.
