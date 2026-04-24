# Config Center Simplification Wave1 — Review Checklist (2026-04-24)

Branch: `integration/config-center-simplification-wave1`
Primary handoff: `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
Merge runbook: `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_MERGE_RUNBOOK_2026-04-24.md`

## Reviewer intent
这份清单不是复述所有 commit，而是帮助 reviewer 用最短路径确认：
1. wave1 的 UI 简化模式是否一致
2. 已知高风险点是否被正确收口
3. 当前分支是否足够安全进入 PR / review

---

## 1. 建议审阅顺序

### Step 1 — 先看总体目标是否达成
阅读：
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_PATTERN_GUIDE_2026-04-24.md`

确认：
- wave1 目标是“system defaults + explicit exceptions”
- 这是第一波集成，不是最终 backend ownership 重构
- 各模块切片都刻意保持 contract-safe

### Step 2 — 看统一 UI 模式是否真的一致
重点文件：
- `src/views/PackagingConfig.vue`
- `src/views/LockConfig.vue`
- `src/views/HandleConfig.vue`
- `src/views/CylinderConfig.vue`
- `src/views/LockForkConfig.vue`

确认：
- 首屏默认不暴露无意义空白行
- 默认策略优先展示系统值
- 例外项只有在需要时才新增
- 文案不要宣称系统其实不支持的能力

### Step 3 — 看 draft-row helper 是否都只停留在页面级
重点文件：
- `src/features/config-editor/utils/packagingEditorState.ts`
- `src/features/config-editor/utils/lockEditorState.ts`
- `src/features/config-editor/utils/handleEditorState.ts`
- `src/features/config-editor/utils/cylinderEditorState.ts`

确认：
- 没有去重写 `useEditableList`
- helper 只负责：
  - meaningful row 判断
  - validation source
  - filtered rows
  - first-add placeholder reuse

### Step 4 — 看 correctness fixes 是否已补洞
重点文件：
- `src/features/config-editor/utils/lockEditorValidation.ts`
- `src/views/LockConfig.vue`
- `src/types/mapping.ts`
- `src/services/mappings/mappingAdapter.ts`
- `shared/mappings/mapping-adapter-core.js`

确认：
- lock 的 table path 和 JSON apply path 都不再静默丢失 model-only row
- lock-fork supplier contract 已统一到 `suppliers.default`
- 不再有 “UI 看起来支持，runtime 实际不支持” 的 lock-fork supplier 形态

---

## 2. 必查风险点

### Risk A — UI simplification accidentally changed runtime contract
重点看：
- `src/views/LockForkConfig.vue`
- `src/types/mapping.ts`
- `shared/mappings/mapping-adapter-core.js`
- `shared/mappings/mapping-adapter-core.mjs`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`

Reviewer should confirm:
- `lock-fork` 现在前端 / type / adapter / validator / runtime 都围绕 `suppliers.default`

### Risk B — Empty-state simplification accidentally drops real config rows
重点看：
- packaging / lock / handle / cylinder 的 `*EditorState.ts`
- 对应页面的 `add*Row/remove*Row`

Reviewer should confirm:
- 只隐藏 synthetic placeholder
- 不隐藏 meaningful rows
- first-add 不会制造双空行
- 搜索条件不会让新增行“看不见”

### Risk C — Frontend-only fix and shared validator drift apart
重点看：
- `src/features/config-editor/utils/lockEditorValidation.ts`
- `shared/mappings/mapping-validator-core.mjs`
- `shared/mappings/mapping-validator-core.js`

Reviewer should confirm:
- 本地补洞是有意为之
- 不会破坏原有 shared validator 语义

---

## 3. 推荐验证命令

最小审阅验证：
```bash
npm run lint:css
node --require tsx/cjs --test tests/print-style-guard.test.ts
npm run type-check
npm run build
```

建议的 wave1 定向回归：
```bash
node --require tsx/cjs --test --test-concurrency=1 \
  tests/config-table-guard.test.ts \
  tests/packaging-editor-state.test.ts \
  tests/lock-config-playground-guard.test.ts \
  tests/lock-editor-state.test.ts \
  tests/lock-editor-validation.test.ts \
  tests/handle-editor-state.test.ts \
  tests/cylinder-config-playground-guard.test.ts \
  tests/cylinder-editor-state.test.ts \
  tests/cylinder-excluded-validator.test.ts \
  tests/lock-fork-config-playground-guard.test.ts \
  tests/mapping-validator.test.ts \
  tests/mapping-server-validator.test.ts \
  tests/mapping-rules-adapter.test.ts \
  tests/shared-mapping-core.test.ts \
  tests/mappings/mapping-parity.test.ts \
  tests/config-loader-mapping.test.ts
```

---

## 4. Review acceptance criteria

Wave1 can be considered review-approved when:
- [ ] Packaging / Lock / Handle / Cylinder / LockFork 的页面语义都符合 “system defaults + explicit exceptions”
- [ ] lock 的静默丢失路径（table + JSON）都已补洞
- [ ] lock-fork supplier contract 已经端到端对齐到 `default-only`
- [ ] 没有为了 UI 简化而引入新的 runtime / adapter contract 漂移
- [ ] 页面级 helper 没有越权变成共享基础设施重构
- [ ] PR/CI required print-style governance command 已经指向真实存在的 `.ts` 测试文件
- [ ] `npm run lint:css` 和 print-style guard 通过
- [ ] type-check 和 build 通过
- [ ] 定向回归测试通过

---

## 5. 非阻断 watch items

这些不是 wave1 阻断项，但 reviewer 可以顺手确认：
- shared `.js` / `.mjs` adapter 双入口未来仍有继续漂移风险
- handle 的 `useSystemDefaultStrategy` 仍是 UI 状态，不是完全派生
- 当前 wave1 还没有进入 packaging runtime/backend dictionary ownership 阶段

---

## 6. Review outcome guidance

### If approved
下一步优先：
1. 准备正式 PR / code review
2. 再决定是走 wave2 共享收口，还是 packaging backend ownership

### If rejected
优先只修：
- contract drift
- silent data loss
- helper 跨页冲突

不要在 review 修复轮里顺手加新试点或新模式。
