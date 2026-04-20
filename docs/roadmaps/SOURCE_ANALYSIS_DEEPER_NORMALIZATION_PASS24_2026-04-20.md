# Source-analysis Deeper Normalization Pass 24 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass24`
> 范围：在不改变 Materials 页面行为的前提下，把 Materials view 对 Source store 的 consumer-facing reads 收束到页面 owner。

---

## 1. 背景

当前 `src/views/Materials.vue` 仍直接读取 Source store：
- `store.hasOrder`
- `store.flatMaterials`
- `store.flatCylinders`
- `store.flatLocks`
- `store.flatHandles`
- `store.flatAccessories`
- `store.flatForks`
- `store.flatPackaging`

而 `useMaterialsPageState()` 已经是页面层 owner 入口，这里仍有一层 consumer-surface split。

---

## 2. 本轮目标

只做一个切口：
- 让 `useMaterialsPageState()` 承接 Materials view 当前依赖的 Source-store consumer reads
- 让 `Materials.vue` 更接近 page-state composition shell

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 workflow / fetch / history / clear / analyze 语义
3. 不改表格列结构与页面布局
4. 不做 broad page regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/materials/composables/useMaterialsPageState.ts`
- `src/views/Materials.vue`
- `tests/materials-page-state.test.ts`
- `tests/materials-page-hardware-sections.test.ts`
- `docs/README.md`

目标：
- Materials view 对 Source store 的 consumer-facing reads 进入 page-state owner
- view 只组合 page-state 输出与表格组件

---

## 5. 完成标准

至少满足：

1. `Materials.vue` 不再直接引用 `store.hasOrder/flat*`
2. `useMaterialsPageState()` 暴露这些 consumer-facing values
3. 页面行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/materials-page-state.test.ts tests/materials-page-hardware-sections.test.ts tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
