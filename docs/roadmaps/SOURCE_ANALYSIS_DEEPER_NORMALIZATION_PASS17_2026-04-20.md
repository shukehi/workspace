# Source-analysis Deeper Normalization Pass 17 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization-pass17`
> 范围：在不改变页面行为的前提下，收紧 Source store 的 exported surface，只暴露当前 UI / rules 确实依赖的 API。

---

## 1. 背景

当前 `useSourceStore()` 仍把 workflow 内部动作完整暴露出来，其中：
- `applyContractData`
- `calculateMaterials`

并没有被当前 UI 或规则层直接依赖，已经形成一个清晰的小 seam：store exported surface 可以继续收束。

---

## 2. 本轮目标

只做一个切口：
- 从 `useSourceStore()` 的 return surface 中移除未使用的 workflow-internal actions
- 保持现有 UI / rules / workflow 行为不变

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
- `tests/source-store-surface-guard.test.ts`（新增）
- `docs/README.md`

目标：
- store surface 更贴近真实 consumer needs
- workflow internal actions 不再从 store shell 泄漏

---

## 5. 完成标准

至少满足：

1. `applyContractData` / `calculateMaterials` 不再出现在 store return surface
2. 现有 UI / rules 行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source-store-surface-guard.test.ts tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
