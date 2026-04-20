# Branch Progress — refactor/source-analysis-deeper-normalization-pass17 (2026-04-20)

> 状态：已完成，可封板。
> 分支：`refactor/source-analysis-deeper-normalization-pass17`
> 计划：`docs/roadmaps/SOURCE_ANALYSIS_DEEPER_NORMALIZATION_PASS17_2026-04-20.md`
> 实现提交：`08094ab`

---

## 1. 本轮完成内容

本轮继续按 source-analysis deeper-normalization 的节奏，只收一个清晰 seam：

- 将 workflow-internal actions 从 Source store exported surface 中移除
- 让 `useSourceStore()` 更贴近真实 consumer-facing surface

结果：
- store 不再导出 `applyContractData`
- store 不再导出 `calculateMaterials`
- source-analysis store surface 泄漏进一步减少

---

## 2. 变更文件

- `src/stores/useSourceStore.ts`
- `tests/source-store-surface-guard.test.ts`
- `docs/roadmaps/SOURCE_ANALYSIS_DEEPER_NORMALIZATION_PASS17_2026-04-20.md`
- `docs/README.md`

---

## 3. 验证

已通过：

- `npm run type-check`
- `npm run type-check:server`
- `node --require tsx/cjs --test --test-concurrency=1 tests/source-store-surface-guard.test.ts tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-page-state.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts`
- `npm test`
- `npm run build`

---

## 4. 封板判断

本轮继续满足 deeper-normalization 约束：
- 单一 seam
- 无行为变更
- review 范围小
- 测试与门禁完整通过

可以封板，并进入下一次优先级刷新。
