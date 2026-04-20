# Source-analysis Deeper Normalization Pass 25 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass25`
> 范围：在不改变 Source 页面行为的前提下，把 Source store wiring 收束到 page-state owner。

---

## 1. 背景

当前 `src/views/Source.vue` 仍直接承担 Source store wiring：
- `useSourceStore()`
- 将 store 传入 `useSourcePageState()`

而 `useSourcePageState()` 已经是 Source 页面的 page-state owner，这里仍残留一层轻薄的 consumer-surface wiring seam。

---

## 2. 本轮目标

只做一个切口：
- 让 `useSourcePageState()` 自身持有默认的 Source store wiring
- 让 `Source.vue` 更接近纯 page-state composition shell
- 保留测试可注入 store 的能力，避免牺牲可验证性

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime / workflow 行为
2. 不改 fetch/history/clear/analyze 语义
3. 不改表格列结构与页面布局
4. 不做 broad page/store regrouping
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
- Source 页面不再直接负责 `useSourceStore()` wiring
- page-state owner 继续暴露同一套 consumer-facing values 与 actions

---

## 5. 完成标准

至少满足：

1. `Source.vue` 不再直接导入或实例化 `useSourceStore`
2. `useSourcePageState()` 默认内部完成 Source store wiring
3. 测试仍可注入 fake store 进行隔离验证
4. 页面行为不变
5. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-page-state.test.ts tests/source-table-layout-guard.test.ts tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/materials-page-state.test.ts tests/materials-page-hardware-sections.test.ts tests/generate-po-source-state.test.ts tests/generate-po-dialog-guard.test.ts tests/contracts-history-view-guard.test.ts tests/source-history-load-state.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
