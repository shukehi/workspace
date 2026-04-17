# Inventory Store / State Pass 5 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass5`
> 范围：在多轮 flow helper 下沉之后，继续收口 `useInventoryStore.ts` 中仍集中的 state/computed 初始化，但不改变 store 对外 contract。

---

## 1. 背景

Inventory store 已完成：

- pagination helper
- core flows helper
- location/outbound flows helper
- receipts/movements history flows helper

当前 store 中剩余最集中的块，已经主要不是 API flow，而是：

- refs 初始化
- loading/page totals state
- sorted/filtered computed selectors

---

## 2. 本轮目标

继续让 `useInventoryStore.ts` 更接近：
- state container 入口
- 对外暴露面

本轮优先顺序：
1. 抽 state/computed 初始化 helper
2. 如果这一刀顺利，再判断是否还有值得继续做的轻量切口

---

## 3. 本轮不做的事

1. 不拆成多个 Pinia store
2. 不改 store 对外暴露字段名
3. 不改页面行为
4. 不改 Inventory domain contract
5. 不引入新依赖

---

## 4. 推荐切口

建议 helper 模块：
- `src/features/inventory/inventoryStoreState.ts`

优先承接：
- refs 初始化
- loading / page state
- sorted / low-stock / active-locations 等 computed selectors

---

## 5. 完成标准

至少满足：

1. `useInventoryStore.ts` 中集中 state/computed 块明显下降
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
