# Source-analysis Deeper Normalization Pass 16 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass16`
> 范围：在不改变 source-analysis 行为的前提下，把 Source store state refs 从 store shell 中提炼为独立 owner。

---

## 1. 背景

当前 `useSourceStore()` 仍直接承载：
- `currentOrder`
- `materialRequirements`
- `hardwareRequirements`
- `analysisResult`
- `loading`
- `error`

这些 refs 已形成一个清晰的小 seam：state owner 可以独立出来，让 store 只组合 state / selectors / derived / workflow owners。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source store state helper
- 让 `useSourceStore()` 更接近 composition shell

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
- `src/features/source-analysis/composables/useSourceStoreState.ts`（新增）
- `tests/source-store-state.test.ts`（新增）
- `docs/README.md`

目标：
- source store refs 拥有独立 owner
- store 只组合 state / selectors / derived / workflow owners

---

## 5. 完成标准

至少满足：

1. state refs 不再内联在 `useSourceStore.ts`
2. source-analysis 行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-store-state.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
