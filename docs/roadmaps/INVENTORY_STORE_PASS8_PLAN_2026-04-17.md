# Inventory Store / State Pass 8 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass8`
> 范围：继续收口 `useInventoryStore.ts`，优先处理 location / outbound action wrapper 这一组剩余 surface，但不改变页面行为或 API contract。

---

## 1. 背景

在前几轮 store/state 收口后，已经完成：

- pagination helper
- core flow helper
- core actions helper
- state helper
- history flows / history actions helper
- location / outbound flow helper

当前 store 中仍直接保留的一组自然 action wrapper 是：
- `fetchInventoryLocations`
- `createInventoryLocation`
- `updateInventoryLocation`
- `fetchInventoryOutbounds`
- `fetchInventoryOutbound`
- `fetchAllInventoryOutbounds`
- `createInventoryOutbound`
- `reverseInventoryOutbound`

这些函数已经依赖独立 flow helper，但它们自己的 store-state 编排仍留在 `useInventoryStore.ts` 中。

---

## 2. 本轮目标

继续把剩余自包含 action wrapper 下沉，让 `useInventoryStore.ts` 更接近：

- state container
- helper 组合层
- 对外暴露壳

本轮优先顺序：
1. location / outbound actions helper
2. 如果这一刀顺利，再判断是否还需要更深的 partitioning

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
- `src/features/inventory/inventoryStoreFlowActions.ts`

优先承接：
- location actions
- outbound actions

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
node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
