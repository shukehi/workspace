# Source-analysis Deeper Normalization Pass 5 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass5`
> 范围：在不改变 source-analysis 行为的前提下，把 request loading/error application 从 workflow orchestration 中提炼为独立 owner。

---

## 1. 背景

当前 `createSourceOrderWorkflow()` 的 fetch/history 分支仍同时承担：
- request begin/end loading state
- error reset
- error message writeback
- fetch / history load orchestration

其中 request state application 已形成独立职责，可以继续收成一刀更小、更稳的 normalization seam。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source-order request state applier helper
- 让 workflow 更聚焦于 fetch/history/analyze orchestration

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 fetch / history load 语义
3. 不改 store / view 结构
4. 不做 broad workflow regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/source-analysis/services/sourceOrderWorkflow.ts`
- `src/features/source-analysis/services/sourceOrderRequestStateApplier.ts`（新增）
- `tests/source-order-request-state.test.ts`
- `tests/source-store-workflow.test.ts`
- `docs/README.md`

目标：
- request loading/error owner 独立
- workflow 只组合 fetch/history/analyze side effects

---

## 5. 完成标准

至少满足：

1. loading / error reset / error writeback 不再内联在 workflow 中
2. source-analysis 行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
