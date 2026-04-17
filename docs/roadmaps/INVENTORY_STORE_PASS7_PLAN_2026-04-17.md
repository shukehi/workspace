# Inventory Store / State Pass 7 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass7`
> 范围：继续收口 `useInventoryStore.ts`，优先处理 inventory 主列表 / min-stock / adjustment 这组剩余 core action wrapper，但不改变页面行为或 API contract。

---

## 1. 背景

在前几轮 store/state 收口后，已经完成：

- pagination helper
- core flow helper
- state helper
- history flows / history actions helper
- location / outbound flow helper

当前 store 中仍直接保留的最自然 action 组之一是：
- `fetchInventory`
- `updateMinStock`
- `createInventoryAdjustment`

这些函数已经依赖独立 flow helper，但它们自己的 store-state 编排仍留在 `useInventoryStore.ts` 中。

---

## 2. 本轮目标

继续把剩余自包含 action wrapper 下沉，让 `useInventoryStore.ts` 更接近：

- state container
- helper 组合层
- 对外暴露壳

本轮优先顺序：
1. inventory core actions helper
2. 如果这一刀顺利，再判断是否继续处理 location / outbound action wrapper

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
- `src/features/inventory/inventoryStoreCoreActions.ts`

优先承接：
- `fetchInventory`
- `updateMinStock`
- `createInventoryAdjustment`

---

## 5. 完成标准

至少满足：

1. 上述 action wrapper 不再直接内联在 store 中
2. store 中剩余逻辑更接近纯 state/container 壳
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
