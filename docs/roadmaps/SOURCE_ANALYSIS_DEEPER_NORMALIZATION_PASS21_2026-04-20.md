# Source-analysis Deeper Normalization Pass 21 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass21`
> 范围：在不改变历史合同加载行为的前提下，把 ContractHistoryDialog 对 Source store 的 direct reads 收束到独立 owner。

---

## 1. 背景

当前 `src/components/source/ContractHistoryDialog.vue` 仍直接读取 Source store：
- `store.hasOrder`
- `store.loading`
- `store.error`
- `store.loadHistoryContractByCode(...)`

而这部分已经形成一个独立的小 seam：dialog-facing Source-store surface 可以先有自己的 owner，再由组件只负责 UI 交互。

---

## 2. 本轮目标

只做一个切口：
- 提炼历史合同加载桥接 helper
- 让 `ContractHistoryDialog.vue` 不再直接依赖 Source store 的 consumer-facing reads

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改历史合同加载语义
3. 不改列表筛选 / 分页逻辑
4. 不做 broad dialog regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/components/source/ContractHistoryDialog.vue`
- `src/features/source-analysis/composables/useSourceHistoryLoadState.ts`（新增）
- `tests/source-history-load-state.test.ts`（新增）
- `tests/source-history-dialog-guard.test.ts`（新增）
- `docs/README.md`

目标：
- dialog-facing Source-store surface 拥有独立 owner
- dialog 只组合 UI 交互与 history-store state

---

## 5. 完成标准

至少满足：

1. `ContractHistoryDialog.vue` 不再直接读取 `store.hasOrder/loading/error/loadHistoryContractByCode`
2. 页面行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-history-load-state.test.ts tests/source-history-dialog-guard.test.ts tests/source-page-state.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-analysis-runtime.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
