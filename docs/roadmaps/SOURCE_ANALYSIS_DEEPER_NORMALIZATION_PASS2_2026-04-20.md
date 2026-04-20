# Source-analysis Deeper Normalization Pass 2 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass2`
> 范围：在不改变 source-analysis 行为的前提下，把 analysis-result state application 从 workflow orchestration 中提炼为独立 owner。

---

## 1. 背景

当前 `createSourceOrderWorkflow()` 仍同时负责：
- fetch / cache / snapshot orchestration
- analysis result 写入 state
- analysis error 回退清空
- clear 时的 analysis state 重置

其中 analysis-result state application 已形成独立职责，可以继续收成一刀更小、更稳的 normalization seam。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source-analysis result state applier helper
- 让 `createSourceOrderWorkflow()` 更聚焦于 fetch/cache/orchestration

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 snapshot / contract fetch 语义
3. 不改 page state / view 层结构
4. 不做更大范围 workflow regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/source-analysis/services/sourceOrderWorkflow.ts`
- `src/features/source-analysis/services/sourceAnalysisStateApplier.ts`（新增）
- `tests/source-store-workflow.test.ts`
- `docs/README.md`

目标：
- analysis result state ownership 独立
- workflow 只负责 orchestration 和 side effects

---

## 5. 完成标准

至少满足：

1. analysis result / materialRequirements / hardwareRequirements 的写入不再内联在 workflow 中
2. clear 时 analysis state reset 不再内联在 workflow 中
3. source-analysis 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
