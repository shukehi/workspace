# Source-analysis Deeper Normalization Pass 15 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass15`
> 范围：在不改变 source-analysis 行为的前提下，把 store-facing workflow bootstrap delegation 从 store shell 中提炼为独立 owner。

---

## 1. 背景

当前 `useSourceStore()` 仍直接承担：
- workflow state refs wiring 进 `createSourceOrderWorkflow()`
- bootstrap 时机上的 `rehydrateFromSnapshot()` 调用

这已经形成一个独立的小 seam：store-facing workflow bridge / bootstrap delegation 应先有自己的 owner，再由 store 只负责 state + selector composition。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source store workflow bridge helper
- 让 `useSourceStore()` 不再内联 workflow bootstrap delegation

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 workflow / fetch / history / clear / analyze 语义
3. 不改页面结构
4. 不做 broad store regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/stores/useSourceStore.ts`
- `src/features/source-analysis/composables/useSourceStoreWorkflow.ts`（新增）
- `tests/source-store-workflow-bridge.test.ts`（新增）
- `docs/README.md`

目标：
- store-facing workflow bootstrap 拥有独立 owner
- store 只组合 state / selectors / derived-state / workflow-bridge owners

---

## 5. 完成标准

至少满足：

1. `createSourceOrderWorkflow(...)` wiring 不再内联在 `useSourceStore.ts`
2. `rehydrateFromSnapshot()` bootstrap 调用不再内联在 `useSourceStore.ts`
3. source-analysis 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
