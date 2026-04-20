# Source-analysis Deeper Normalization Pass 10 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass10`
> 范围：在不改变 source-analysis 行为的前提下，把 fetch/history request delegation 从 workflow orchestration 中提炼为独立 owner。

---

## 1. 背景

当前 `createSourceOrderWorkflow()` 的 fetch/history 入口仍同时承担：
- contract code normalization / blank handling
- request begin / finish lifecycle
- fetch / history load delegation
- success path applyContractData 调用
- failure path failSourceOrderFetch / failSourceOrderHistoryLoad 调用

这已经形成一个独立的小 seam：request delegation contract 应先有自己的 owner，再由 workflow 只负责拼接 surface。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source-order fetch runner helper
- 让 workflow 不再内联 fetch/history request delegation 流程

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
- `src/features/source-analysis/services/sourceOrderFetchRunner.ts`（新增）
- `tests/source-order-fetch-runner.test.ts`
- `tests/source-store-workflow.test.ts`
- `docs/README.md`

目标：
- fetch/history request delegation 拥有独立 owner
- workflow 只组合 request / contract / cache / analyze / clear 这些 owner

---

## 5. 完成标准

至少满足：

1. fetch/history request lifecycle 不再内联在 workflow 中
2. blank input / history payload validation contract 仍保持原语义
3. source-analysis 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
