# 采购与库存边界改造 Phase 1 进度记录（2026-03-12）

## 本轮完成内容

本轮已完成采购与库存边界改造第一阶段的核心落地，覆盖后端状态流转、库存流水、采购页动作、统计口径以及库存页入库记录展示。

已完成项：

1. 订单状态扩展为 `draft / submitted / processing / arrived / completed / cancelled`
2. 新增到货与入库相关字段：
   - `arrived_at / arrived_by / arrived_remark`
   - `stocked_in_at / stocked_in_by / stocked_in_remark`
3. 完成 `POST /api/orders/:id/arrive`
4. 完成 `POST /api/orders/:id/stock-in`
5. 新增 `InventoryReceipt` 模型与 `GET /api/inventory-receipts`
6. 采购管理页完成：
   - 行级动作“开始采购 / 登记到货 / 执行入库”
   - 批量动作同语义改造
   - 到货日期 / 入库日期列
   - 查看入库记录入口
7. 库存管理页完成：
   - 采购入库记录表格
   - 按订单号定位查看
   - 从入库记录跳回采购页定位订单
8. 统计页与摘要卡片已同步 `arrived / 已入库` 口径

## 本轮修复项

本轮在审查过程中补修了几处关键回归风险：

1. 修复“登记到货”会清空既有 `delivery_date`
2. 修复空明细订单仍可执行 `stock-in`
3. 修复批量到货 / 批量入库部分成功时缺少明确提示
4. 修复库存页订单号筛选只做前端过滤、不走服务端查询
5. 修复库存记录跳回采购页后不能按订单号定位
6. 修复入库记录请求失败时静默保留旧数据

## 关键文件

- [`/Users/aries/Dve/workspace/server/services/OrderService.js`](/Users/aries/Dve/workspace/server/services/OrderService.js)
- [`/Users/aries/Dve/workspace/server/services/InventoryReceiptService.js`](/Users/aries/Dve/workspace/server/services/InventoryReceiptService.js)
- [`/Users/aries/Dve/workspace/server/routes/order.js`](/Users/aries/Dve/workspace/server/routes/order.js)
- [`/Users/aries/Dve/workspace/server/routes/inventoryReceipts.js`](/Users/aries/Dve/workspace/server/routes/inventoryReceipts.js)
- [`/Users/aries/Dve/workspace/src/views/Procurement.vue`](/Users/aries/Dve/workspace/src/views/Procurement.vue)
- [`/Users/aries/Dve/workspace/src/views/Inventory.vue`](/Users/aries/Dve/workspace/src/views/Inventory.vue)
- [`/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts`](/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts)
- [`/Users/aries/Dve/workspace/src/components/procurement/ProcurementColumns.ts`](/Users/aries/Dve/workspace/src/components/procurement/ProcurementColumns.ts)
- [`/Users/aries/Dve/workspace/src/components/inventory/InventoryReceiptColumns.ts`](/Users/aries/Dve/workspace/src/components/inventory/InventoryReceiptColumns.ts)

## 已验证

- `node --test tests/order-service.test.js`
- `node --test tests/order-routes.test.js`
- `node --test tests/inventory-route.test.js`
- `node --test tests/procurement-columns-guard.test.js`
- `node --test tests/inventory-view-guard.test.js`
- `npx tsx --test tests/procurement-page-state.test.ts`
- `npx tsx --test tests/procurement-preview.test.ts`

## 当前遗留

1. 还没有入库记录详情页
2. 还不支持部分入库、多次入库、撤销入库
3. 库存页入库记录尚未做分页、导出、汇总统计
