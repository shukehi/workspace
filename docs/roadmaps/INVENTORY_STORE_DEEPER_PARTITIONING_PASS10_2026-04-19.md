# Inventory Store Deeper Partitioning Pass 10 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass10`
> 范围：在 flow 层已经成为 location/outbound payload canonical source 后，继续把 location dialog 的 emit payload typing 归回 flow 层，而不改变页面行为或 API contract。

---

## 1. 背景

当前 location payload type 已在：
- `inventoryStoreFlows.ts`（canonical flow owner）
- `useInventoryLocationState.ts`

之间统一。

但 `InventoryLocationDialog.vue` 仍然内联了一份相同的 submit payload shape，导致 UI surface 仍然重复声明同一 contract。

真实写入语义仍然属于 flow 层，因此 location dialog 更适合直接依赖 flow 层导出的 canonical payload type。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 location dialog 的 submit payload type source
- 让 dialog / composable / flow 三层依赖同一 canonical payload contract

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 dialog 表单逻辑
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/components/inventory/InventoryLocationDialog.vue`
- `src/features/inventory/inventoryStoreFlows.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- flow 层继续作为 location payload type 的唯一 canonical source
- dialog 层不再重复定义相同 payload shape

---

## 5. 完成标准

至少满足：

1. location payload type 只保留一个 canonical source
2. dialog / composable / flow 三层不再重复定义它
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
