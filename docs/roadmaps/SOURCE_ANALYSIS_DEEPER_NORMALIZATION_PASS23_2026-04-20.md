# Source-analysis Deeper Normalization Pass 23 (2026-04-20)

> 状态：当前执行计划。
> 分支：`main`
> 范围：在不改变采购提案行为的前提下，把 GeneratePODialog 对 Source store 的 direct reads 收束到独立 owner。

---

## 1. 背景

当前 `src/components/source/GeneratePODialog.vue` 仍直接读取 Source store：
- `sourceStore.hasOrder`
- `sourceStore.currentOrder`

而这部分已经形成一个清晰的小 seam：dialog-facing Source-store surface 可以先有自己的 owner，再由组件只负责提案交互与生成流程。

---

## 2. 本轮目标

只做一个切口：
- 提炼采购提案对 Source store 的读取桥接 helper
- 让 `GeneratePODialog.vue` 不再直接依赖 Source store 的 consumer-facing reads

---

## 3. 本轮不做的事

1. 不改采购单生成语义
2. 不改 POGenerator 行为
3. 不改页面布局
4. 不做 broad dialog regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/components/source/GeneratePODialog.vue`
- `src/features/source-analysis/composables/useGeneratePOSourceState.ts`（新增）
- `tests/generate-po-source-state.test.ts`（新增）
- `tests/generate-po-dialog-guard.test.ts`（新增）
- `docs/README.md`

目标：
- dialog-facing Source-store surface 拥有独立 owner
- 组件只组合 UI 状态、generator、proposal 流程

---

## 5. 完成标准

至少满足：

1. `GeneratePODialog.vue` 不再直接读取 `sourceStore.hasOrder/currentOrder`
2. 采购提案行为不变
3. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/generate-po-source-state.test.ts tests/generate-po-dialog-guard.test.ts tests/po-generator-integration.test.ts tests/source-history-load-state.test.ts tests/source-page-state.test.ts tests/source-store-workflow.test.ts tests/source-store-workflow-bridge.test.ts tests/source-analysis-runtime.test.ts tests/source-order-analysis-state.test.ts tests/source-order-contract-state.test.ts tests/source-order-contract-cache.test.ts tests/source-order-request-state.test.ts tests/source-order-request-error-applier.test.ts tests/source-analysis-error-applier.test.ts tests/source-order-analysis-runner.test.ts tests/source-order-clear-applier.test.ts tests/source-order-fetch-runner.test.ts tests/source-order-apply-runner.test.ts tests/source-order-rehydrate-runner.test.ts tests/source-analysis-derived-state.test.ts tests/source-order-selectors.test.ts tests/source-store-state.test.ts tests/source-store-surface-guard.test.ts tests/materials-page-hardware-sections.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
