# Inventory Store / State Pass 4 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass4`
> 范围：继续收口 `useInventoryStore.ts`，优先处理 inventory 主列表 / min-stock / adjustment 这组剩余核心 flow，但不改变页面行为或 API contract。

---

## 1. 背景

在前两轮 store/state 收口后，已经完成：

- pagination plumbing helper
- location / outbound flow helper
- receipts / movements history flow helper

当前 store 中仍直接保留的最自然一组流程块是：
- `fetchInventory`
- `updateMinStock`
- `createInventoryAdjustment`

---

## 2. 本轮目标

继续把剩余自包含 flow block 下沉，让 `useInventoryStore.ts` 更接近：

- state container
- 轻量 orchestration shell

本轮优先顺序：
1. inventory list / min-stock / adjustment flow helper
2. 如果这一刀顺利，再判断是否还需要更深的 store partitioning

---

## 3. 本轮不做的事

1. 不改页面行为
2. 不改 API contract
3. 不拆成多个 Pinia store
4. 不改 Inventory domain model
5. 不引入新依赖

---

## 4. 推荐切口

建议 helper 模块：
- `src/features/inventory/inventoryStoreCoreFlows.ts`

优先承接：
- inventory list fetch
- min stock update
- adjustment create / item merge

---

## 5. 完成标准

至少满足：

1. 这三个 flow 不再直接内联在 store 中
2. store 中剩余逻辑更接近纯 state 容器
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
