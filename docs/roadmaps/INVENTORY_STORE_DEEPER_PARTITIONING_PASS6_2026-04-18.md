# Inventory Store Deeper Partitioning Pass 6 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass6`
> 范围：在 state/derived/action composition 已进一步分层后，继续收束 meta state ownership，但不改变页面行为或 API contract。

---

## 1. 背景

当前 `inventoryStoreState.ts` 仍同时负责：
- collection refs
- loading refs
- pagination / total refs
- derived state assembly

在 derived selectors 已经拆出后，下一步最合适的小切口是：
- 把 loading / totals / page / pageSize 这类 meta state 再下沉到独立 helper
- 让 state assembler 更专注于组合 collections、meta state、derived state

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 新增独立 meta-state helper
- `inventoryStoreState.ts` 更聚焦于 state assembly

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 flow/state/helper 运行语义
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreState.ts`
- `src/features/inventory/inventoryStoreMetaState.ts`（新增）
- `tests/inventory-view-guard.test.ts`

目标：
- loading / totals / page state 有独立 helper 文件
- `inventoryStoreState.ts` 更聚焦于 assembly 而不是声明所有 meta refs

---

## 5. 完成标准

至少满足：

1. meta state 有独立 helper 文件
2. `inventoryStoreState.ts` 更聚焦在 collection + meta + derived 的组合
3. 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
