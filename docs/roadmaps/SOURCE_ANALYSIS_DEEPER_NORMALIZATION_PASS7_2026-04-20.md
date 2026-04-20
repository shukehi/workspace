# Source-analysis Deeper Normalization Pass 7 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass7`
> 范围：在不改变 source-analysis 行为的前提下，把 fetch/history error normalization 与 request-state writeback 从 workflow orchestration 中提炼为独立 owner。

---

## 1. 背景

当前 `createSourceOrderWorkflow()` 的 fetch/history 分支仍同时承担：
- error logging
- fetch error message normalize
- history load error message normalize
- request-state failure writeback

这已经形成一个独立的小 seam：error normalization contract 应先有自己的 owner，再由 workflow 只负责 orchestration。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source-order request error applier helper
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
- `src/features/source-analysis/services/sourceOrderRequestErrorApplier.ts`（新增）
- `tests/source-order-request-error-applier.test.ts`
- `tests/source-store-workflow.test.ts`
- `docs/README.md`

目标：
- fetch/history error normalization 与 request-state writeback 拥有独立 owner
- workflow 只组合 request lifecycle、contract apply、cache、analyze side effects

---

## 5. 完成标准

至少满足：

1. fetch/history error normalization 不再内联在 workflow 中
2. request-state failure writeback 不再内联在 workflow 中
3. source-analysis 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
