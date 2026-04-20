# Source-analysis Deeper Normalization Pass 19 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass19`
> 范围：在不改变 Source 页面行为的前提下，把最后一处 Source view 对 source store 的直接读取收束到 page-state owner。

---

## 1. 背景

当前 `src/views/Source.vue` 只剩最后一处直接读取 store：
- `store.loading ? 'Fetching...' : '获取合同'`

而 `useSourcePageState()` 已经拥有对应 loading state，这里是一个非常小但清晰的 consumer-surface seam。

---

## 2. 本轮目标

只做一个切口：
- 让 page-state owner 提供查询按钮文案
- 让 `Source.vue` 不再直接读取 `store.*`

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 workflow / fetch / history / clear / analyze 语义
3. 不改表格结构与页面布局
4. 不做 broad page regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/source-analysis/composables/useSourcePageState.ts`
- `src/views/Source.vue`
- `tests/source-page-state.test.ts`
- `tests/source-table-layout-guard.test.ts`
- `docs/README.md`

目标：
- Source view 不再直接读取 store
- page-state owner 完整承接页面 consumer-facing reads

---

## 5. 完成标准

至少满足：

1. `Source.vue` 中不再出现 `store.` 读取
2. 查询按钮文案由 page-state 提供
3. 页面行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-page-state.test.ts tests/source-table-layout-guard.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-analysis-runtime.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
