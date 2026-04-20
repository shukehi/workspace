# Source-analysis Deeper Normalization Pass 20 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass20`
> 范围：在不改变 Source 页面行为的前提下，把表格展示派生状态从 page-state owner 中提炼为独立 owner。

---

## 1. 背景

当前 `useSourcePageState()` 仍同时承担：
- search / history dialog / long-text mode 这些 page interaction state
- `sourceTableMinWidth`
- `columns`

其中表格展示派生状态已经形成一个独立的小 seam，可以先收成独立 owner。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source page table-state helper
- 让 `useSourcePageState()` 更聚焦于 page interaction state

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 workflow / fetch / history / clear / analyze 语义
3. 不改表格列结构与交互语义
4. 不做 broad page regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/source-analysis/composables/useSourcePageState.ts`
- `src/features/source-analysis/composables/useSourcePageTableState.ts`（新增）
- `tests/source-page-table-state.test.ts`（新增）
- `tests/source-page-state.test.ts`
- `tests/source-table-layout-guard.test.ts`
- `docs/README.md`

目标：
- table presentation derived state 拥有独立 owner
- page-state 只组合 page interaction outputs 与 table-state outputs

---

## 5. 完成标准

至少满足：

1. `sourceTableMinWidth` / `columns` 不再内联在 `useSourcePageState.ts`
2. 页面行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-page-table-state.test.ts tests/source-page-state.test.ts tests/source-table-layout-guard.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-analysis-runtime.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
