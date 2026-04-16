# Inventory Page Refactor Plan (2026-04-16)

> 状态：当前执行计划。
> 范围：`src/views/Inventory.vue` 的第一轮收口，只做页面状态/交互编排拆分，不改变业务语义。

---

## 1. 现状问题

`src/views/Inventory.vue` 当前约 1500+ 行，承担了过多职责：

1. tab 级筛选状态
2. receipts / outbounds / locations / movements 的页面交互编排
3. 导出动作
4. 弹窗/抽屉开关与确认流程
5. 路由 query 到页面状态的同步
6. inventory / outbound / movement 的汇总统计

虽然 inventory receipt 相关已抽到：
- `useInventoryReceiptFlow.ts`
- `useInventoryReceiptRouteState.ts`

但页面仍是单体组合层，风险在于：
- 维护成本高
- watch 交叉依赖重
- 新功能容易继续堆回 `Inventory.vue`

---

## 2. 第一轮拆分目标

本轮不改业务语义，只做“页面编排收口”。

### 目标
1. 把 inventory tab 的筛选/汇总/导出状态抽离
2. 把 outbound tab 的筛选/分页/提交流程抽离
3. 把 location tab 的搜索/弹窗状态抽离
4. 把 movement / outbound / receipt drawer 的页面协调逻辑集中到 composable
5. 保持现有测试、文案、字段语义不变

---

## 3. 第一轮建议拆分边界

### A. Inventory 主 tab 页面状态
建议新增：
- `src/features/inventory/composables/useInventoryPageState.ts`

负责：
- `activeCategory`
- `searchQuery`
- `selectedWarehouseFilter`
- `selectedLocationFilter`
- `lowStockOnly`
- `reconciliationOnly`
- `selectedInventoryRows`
- `selectedMovementItem`
- `filteredItems`
- `reconciliationSummary`
- `handleExportInventory`
- `handleExportReconciliation`
- `openMovementSheet` / `closeMovementSheet`

### B. Outbound 页面状态
建议新增：
- `src/features/inventory/composables/useInventoryOutboundState.ts`

负责：
- `outboundDialogOpen`
- `outboundSaving`
- `outboundNoFilter`
- `outboundKeyword`
- `outboundOperatorFilter`
- `outboundWarehouseFilter`
- `outboundLocationFilter`
- `outboundStartDate`
- `outboundEndDate`
- `outboundPage`
- `outboundPageSize`
- `selectedOutboundDetail`
- `reverseOutboundDialogOpen`
- `reverseOutboundTarget`
- `reverseOutboundReason`
- `reverseOutboundRemark`
- `reversingOutbound`
- `loadOutbounds`
- `handleSubmitOutbound`
- `confirmReverseOutbound`
- `handleExportOutbounds`
- `openOutboundDialog`
- `closeOutboundDetail`
- `nextOutboundPage` / `prevOutboundPage`

### C. Location 页面状态
建议新增：
- `src/features/inventory/composables/useInventoryLocationState.ts`

负责：
- `locationSearchQuery`
- `locationDialogOpen`
- `locationDialogSaving`
- `editingLocation`
- `filteredLocations`
- `openCreateLocationDialog`
- `handleLocationSubmit`

---

## 4. 本轮不做的事

1. 不改 `useInventoryStore.ts` 结构
2. 不改 inventory 后端契约
3. 不改 DataTable / columns 组件结构
4. 不重做 tabs 组件拆分
5. 不修改测试断言语义

---

## 5. 回归验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/inventory-view-guard.test.ts
npm test -- tests/inventory-receipt-flow.test.ts
npm test -- tests/inventory-receipt-route-state.test.ts
npm test -- tests/inventory-route.test.ts
npm test
npm run build
```

---

## 6. 完成标准

第一轮完成后至少满足：

1. `Inventory.vue` 明显缩小
2. inventory / outbound / location 三块页面状态不再全部堆在 view 内
3. 现有 inventory 相关测试继续通过
4. 不引入行为变更
