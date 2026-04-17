# Inventory Store / State Pass 6 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass6`
> 范围：在多轮 helper 与 state 下沉之后，继续收口 `useInventoryStore.ts` 中仍然集中在 store 内的 action 组，但不改变 store 对外 contract。

---

## 1. 背景

Inventory store 已完成：
- pagination helper
- core flow helper
- location / outbound flow helper
- receipts / movements history flow helper
- state / computed 初始化 helper

当前 store 中剩余最明显的块已经主要是：
- receipts / movements action wrappers
- location / outbound action wrappers
- return surface 组装

---

## 2. 本轮目标

继续让 `useInventoryStore.ts` 更接近：
- state helper + flow helper + thin shell

本轮优先顺序：
1. 先抽 history actions（receipts / movements）
2. 如果第一刀顺利，再判断是否继续抽 location/outbound actions

---

## 3. 本轮不做的事

1. 不拆成多个 Pinia store
2. 不改 store 对外暴露字段名
3. 不改页面行为
4. 不引入新依赖
5. 不在第一刀里同时处理所有 action 组

---

## 4. 推荐切口

建议 helper 模块：
- `src/features/inventory/inventoryStoreHistoryActions.ts`

优先承接：
- `fetchInventoryReceipts`
- `fetchAllInventoryReceipts`
- `fetchInventoryReceipt`
- `reverseReceipt`
- `fetchInventoryMovements`

---

## 5. 完成标准

至少满足：
1. history action 组不再直接内联在 store 中
2. store 对外 contract 保持不变
3. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/inventory-view-guard.test.ts
npm test -- tests/inventory-receipt-flow.test.ts
npm test -- tests/inventory-receipt-route-state.test.ts
npm test -- tests/inventory-route.test.ts
npm test -- tests/governance-boundary-guard.test.ts
npm test
npm run build
```
