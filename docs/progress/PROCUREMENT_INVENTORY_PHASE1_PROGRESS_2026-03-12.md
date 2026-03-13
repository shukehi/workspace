# 采购与库存边界改造 Phase 1 进度记录（2026-03-12）

## 本轮完成内容

本轮已完成采购与库存边界改造第一阶段的核心落地，并补上了 Phase 2 前置约束，覆盖后端状态流转、库存流水、采购页动作、统计口径以及库存页入库记录展示。

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
   - 入库记录摘要指标与 CSV 导出
8. 统计页与摘要卡片已同步 `arrived / 已入库` 口径
9. 已冻结 `completed` 订单编辑，并将 `arrived` 订单收敛为“仅可修改交货日期/备注”的受限编辑
10. `OrderItem` 已补充 `ordered_quantity / received_quantity` 基础字段，为 Phase 2 部分入库做准备
11. 后端 `stock-in` 已支持传 `items[]` 进行按明细、按数量入库；未传时仍兼容按剩余量整单入库
12. 采购页已新增单单“明细入库弹窗”，支持填写本次入库数量并区分“部分入库成功 / 入库完成”
13. 库存页已支持撤销正向入库记录，并通过反向流水回退库存与订单累计入库量
14. 撤销入库已补充 `reverse_reason` 结构化字段，库存页改为确认弹窗而不是简单 confirm
15. 库存页撤销成功后会发出采购刷新信号，采购页可自动同步 `completed -> arrived`
16. 库存页已支持对正向入库流水执行“部分撤销”，并展示 `reversed_quantity / reversible_quantity`
17. 库存页已新增“入库撤销轨迹”审计区块，可查看原始流水与其撤销子流水
18. 库存页入库记录已支持按方向、撤销原因筛选，并区分“累计入库数量”和“净入库数量”口径
19. 入库记录 CSV 导出已补充方向、撤销原因、剩余可撤销等审计字段
20. 库存页“入库撤销轨迹”已升级为详情抽屉，并支持直接跳转采购单定位源订单
21. `GET /api/inventory-receipts` 已切换为分页返回结构，库存页分页能力开始落地
22. 库存页入库记录已统一改为服务端筛选 + 服务端分页，避免当前页本地过滤导致的空页和口径不一致
23. 库存页已补充 `pageSize` 切换与 URL 同步，分页交互基本收口
24. 入库记录导出已改为按已生效查询条件导出全量结果，不再只导出当前页
25. 轨迹抽屉已能在分页场景下独立拉取完整订单流水，避免当前页缺少原始记录时无法查看
26. 已新增独立“入库记录详情页”，可按单条流水直达查看原始入库、净入库与撤销轨迹

## 本轮修复项

本轮在审查过程中补修了几处关键回归风险：

1. 修复“登记到货”会清空既有 `delivery_date`
2. 修复空明细订单仍可执行 `stock-in`
3. 修复批量到货 / 批量入库部分成功时缺少明确提示
4. 修复库存页订单号筛选只做前端过滤、不走服务端查询
5. 修复库存记录跳回采购页后不能按订单号定位
6. 修复入库记录请求失败时静默保留旧数据
7. 修复普通建单/改单路径可伪造 `ordered_quantity / received_quantity`
8. 修复整单 `stock-in` 缺少超量入库拦截
9. 修复部分入库前后端缺少稳定明细键的问题，订单明细响应已补 `item_key`
10. 修复显式 `items: []` 会误回退成整单入库的问题
11. 修复部分入库时订单级 `stocked_in_*` 语义提前污染的问题
12. 修复明细入库弹窗默认预填满数量，导致误整单入库的问题
13. 临时禁用批量入库入口，避免旧整单语义与新明细入库弹窗冲突
14. 撤销入库现在会回退库存与订单状态，避免误录入库后只能继续补录
15. 修复撤销入库在校验原因前先修改库存/订单的危险顺序
16. 修复“显式传空数量或超量撤销”会污染部分撤销语义的问题，现已按剩余可撤销量严格校验
17. 修复库存页摘要把撤销负数误算进“累计入库数量”的口径错误
18. 修复入库记录 CSV 导出丢失方向与撤销审计字段的问题
19. 修复分页后 `reversed_quantity / reversible_quantity` 只按当前页统计的问题
20. 修复分页后轨迹抽屉无法找到原始流水的问题
21. 修复导出读取输入框瞬时值、与页面当前结果短暂分叉的问题
22. 修复已无剩余待入库明细的 `arrived` 订单仍显示“执行入库”入口并打开空弹窗的问题
23. 修复历史单据 `ordered_quantity = 0` 时被误判为“不可继续入库”的兼容问题，前后端统一回退使用 `quantity`

## 关键文件

- [`/Users/aries/Dve/workspace/server/services/OrderService.js`](/Users/aries/Dve/workspace/server/services/OrderService.js)
- [`/Users/aries/Dve/workspace/server/services/InventoryReceiptService.js`](/Users/aries/Dve/workspace/server/services/InventoryReceiptService.js)
- [`/Users/aries/Dve/workspace/server/services/orderItemKey.js`](/Users/aries/Dve/workspace/server/services/orderItemKey.js)
- [`/Users/aries/Dve/workspace/server/routes/order.js`](/Users/aries/Dve/workspace/server/routes/order.js)
- [`/Users/aries/Dve/workspace/server/routes/inventoryReceipts.js`](/Users/aries/Dve/workspace/server/routes/inventoryReceipts.js)
- [`/Users/aries/Dve/workspace/server/models/OrderItem.js`](/Users/aries/Dve/workspace/server/models/OrderItem.js)
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

1. 已支持部分入库、多次入库与部分撤销入库，详情能力已从抽屉扩展到独立详情页，但仍可继续增强详情页信息密度
2. 库存页入库记录已完成服务端筛选、服务端分页与页大小切换，但仍缺更细的分页体验优化
3. 批量入库暂时禁用，尚未提供批量场景下的明细选择方案
4. 订单级 `stocked_in_*` 仍只表达“整单完成入库”，若后续要展示最近一次入库时间需新增独立字段或直接读流水
5. 采购页当前依赖浏览器 `storage` 事件感知库存页撤销，后续可考虑抽成统一事件总线
6. 入库记录导出当前仍是平面 CSV，尚未包含“原始流水 -> 撤销子流水”的层级关系

## 下一步建议

下一阶段建议先把现有 Phase 2 能力做完整展示和可运维化，再决定是否继续扩批量场景。

对应方案文档：

- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md)
- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md)
