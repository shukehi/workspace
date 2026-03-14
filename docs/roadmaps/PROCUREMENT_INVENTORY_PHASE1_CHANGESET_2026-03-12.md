# 采购与库存边界改造第一阶段变更清单（2026-03-12）

> 状态：历史阶段文档。
> 当前已落地结果请优先查看 `docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md`。

## 1. 目标

本清单用于把“采购管理与库存管理边界改造计划”落到可开发的最小实现范围，覆盖：

1. 状态扩展
2. 订单字段扩展
3. 入库流水建模
4. 接口改造
5. 前端状态/文案/统计同步

本阶段目标不是一次性完成完整库存子系统，而是建立“到货”和“入库”两个明确节点，并保证库存变更可追踪。

本阶段固定口径：

1. `arrived` 计入“待处理单”，因为其业务含义是“已到货但尚未完成入库闭环”。
2. 采购管理页的批量操作栏必须与行级操作保持同一语义，不允许保留旧“结案”含义。

## 2. 必改数据模型

### 2.1 Order 模型

文件：

- `/server/models/Order.js`
- `/src/types/order.ts`

新增字段：

- `arrived_at`
- `arrived_by`
- `arrived_remark`
- `stocked_in_at`
- `stocked_in_by`
- `stocked_in_remark`

状态扩展：

- 由 `draft | submitted | processing | completed | cancelled`
- 扩展为 `draft | submitted | processing | arrived | completed | cancelled`

注意：

1. `completed` 语义固定为“已入库完成”。
2. `arrived` 语义固定为“已到货待入库”。

### 2.2 InventoryReceipt 模型

建议新增文件：

- `/server/models/InventoryReceipt.js`

建议字段：

- `id`
- `order_id`
- `order_no`
- `order_item_id`
- `material_id`
- `item_name`
- `supplier`
- `quantity`
- `unit`
- `receipt_date`
- `operator`
- `remark`
- `created_at`
- `updated_at`

注意：

1. `order_item_id` 只作为辅助关联字段，不能作为唯一追溯依据。
2. 必须冗余订单快照字段，因为当前订单明细更新仍是“删后重建”。

## 3. 必改数据库初始化逻辑

文件：

- `/server/models/index.js`

当前项目不是独立 migration 框架，而是依赖 `initDB()` 中的增量补列逻辑。

因此本阶段必须：

1. 扩展 `ensureOrderColumns()`，补齐新增订单字段。
2. 为 `inventory_receipts` 新表注册 model 与关联。
3. 如需索引，在 `initDB()` 中增加对应的建表后补充逻辑。

## 4. 必改后端服务

### 4.1 OrderService

文件：

- `/server/services/OrderService.js`

必须修改：

1. 扩展状态校验，允许 `arrived` 进入序列。
2. 新增 `markArrived()` 之类的方法。
3. 新增 `stockInOrder()` 编排入口。
4. 审查自动单幂等逻辑，尤其是与状态名绑定的恢复分支。

重点检查：

- `cancelled -> *` 恢复路径
- `statusTransition` 相关分支
- `findDuplicateAutoOrder()` 在新状态下的行为

### 4.2 新增 InventoryReceiptService

建议新增文件：

- `/server/services/InventoryReceiptService.js`

负责：

1. 生成入库流水
2. 应用库存增量
3. 事务控制

## 5. 必改后端接口

文件：

- `/server/routes/order.js`

建议新增：

### 5.1 到货接口

```http
POST /api/orders/:id/arrive
```

### 5.2 入库接口

```http
POST /api/orders/:id/stock-in
```

说明：

1. `stock-in` 接口是“入库流水与库存更新”任务的对外入口，不得单独跳过。
2. 入库流水写入、库存增量更新、订单状态更新必须通过同一事务完成。

### 5.3 入库记录接口

建议新增文件：

- `/server/routes/inventoryReceipts.js`

接口：

```http
GET /api/inventory-receipts
```

## 6. 必改前端类型与页面

### 6.1 采购管理页

文件：

- `/src/components/procurement/ProcurementColumns.ts`
- `/src/components/procurement/ProcurementBulkActionBar.vue`
- `/src/views/Procurement.vue`
- `/src/features/procurement/useProcurementPageState.ts`

必须同步：

1. 状态显示文案
2. 状态按钮行为
3. 筛选项
4. 到货日期 / 入库日期列
5. 批量操作栏按钮语义

固定要求：

1. `arrived` 纳入待处理单统计与筛选。
2. 批量操作栏不允许继续将 `completed` 表述为“结案”。
3. 行级操作与批量操作必须使用相同状态文案和相同业务语义。

### 6.2 统计页与统计 store

文件：

- `/src/stores/useStatisticsStore.ts`
- `/src/views/Statistics.vue`

必须同步：

1. `pendingOrdersCount` 口径
2. `statusStats` 枚举
3. 状态标签与颜色映射
4. 描述文案“等待后续入库处理”的含义

固定口径：

1. `pendingOrdersCount` 必须包含 `draft / submitted / processing / arrived`
2. 统计页状态分布必须显式展示 `arrived`

### 6.3 订单类型定义

文件：

- `/src/types/order.ts`

必须同步新增：

- 新状态 `arrived`
- 订单新增时间/操作人/备注字段

## 7. 测试补齐范围

### 7.1 后端

建议新增或修改：

- `tests/order-service.test.js`
- `tests/order-routes.test.js`

至少覆盖：

1. `processing -> arrived`
2. `arrived -> completed`
3. 非法状态流转拒绝
4. 自动单恢复路径在 `arrived` 下仍正确
5. 入库后库存与流水同时更新

### 7.2 前端

建议新增或修改：

- `tests/procurement-columns-guard.test.js`
- `tests/procurement-page-state.test.ts`
- 统计相关测试（如无现成测试则新增）

至少覆盖：

1. 新状态列显示
2. 新状态筛选
3. 统计页状态分布包含 `arrived`
4. 待处理单口径是否包含 `arrived`

## 8. 实施顺序建议

1. 扩展 `Order` 类型与模型
2. 注册 `InventoryReceipt` 模型
3. 修改 `OrderService` 状态流转与幂等恢复
4. 实现 `arrive` / `stock-in` 接口
5. 实现库存流水写入与库存增量更新
6. 修改采购页按钮和列表字段
7. 修改统计页与统计 store
8. 补齐测试

## 9. 本阶段明确不做

1. 不做完整仓库作业流或批次管理
2. 不做复杂部分入库 UI
3. 不做财务对账
4. 不引入新的大型状态机框架

## 10. 完成判定

第一阶段完成时，必须满足：

1. 采购单可从 `processing` 标记到货，再从 `arrived` 执行入库。
2. 入库后库存汇总值发生变化。
3. 每次入库都有对应流水记录。
4. 采购页、统计页、筛选器对新状态口径一致。
5. 自动采购单的幂等逻辑在新状态下未被破坏。

## 11. 开发任务拆分

### 任务 1：订单状态与字段扩展

目标：

1. 扩展订单状态，新增 `arrived`
2. 新增到货/入库相关字段
3. 同步前后端类型定义

涉及：

- `/server/models/Order.js`
- `/server/models/index.js`
- `/src/types/order.ts`

完成标准：

1. 数据库启动后可自动补齐新增字段
2. 查询订单接口可返回新字段
3. 前端类型检查可通过

### 任务 2：后端状态流转与幂等修正

目标：

1. 支持 `processing -> arrived -> completed`
2. 修正自动采购单幂等逻辑对新状态的兼容

涉及：

- `/server/services/OrderService.js`
- `/server/routes/order.js`

完成标准：

1. 非法状态流转被拒绝
2. `cancelled -> *` 恢复路径覆盖 `arrived`
3. 新状态不破坏重复建单保护

### 任务 3：入库流水与库存更新

目标：

1. 建立采购入库流水
2. 入库时同步更新库存汇总值
3. 通过 `stock-in` 接口暴露事务化入库能力

涉及：

- `server/models/InventoryReceipt.js`
- `/server/models/index.js`
- `server/services/InventoryReceiptService.js`
- 相关 route 文件

完成标准：

1. 入库成功后可查询到流水记录
2. `Material.stock_quantity` 正确增加
3. 失败时事务回滚
4. `stock-in` 接口已接通并复用同一事务逻辑

### 任务 4：采购管理页状态与动作改造

目标：

1. 采购页支持“登记到货”“执行入库”
2. 列表补充到货日期/入库日期
3. 统一状态文案
4. 批量操作栏与行级操作语义一致

涉及：

- `/src/views/Procurement.vue`
- `/src/components/procurement/ProcurementColumns.ts`
- `/src/features/procurement/useProcurementPageState.ts`

完成标准：

1. 按钮仅在正确状态出现
2. 列表和筛选器支持新状态
3. 不再混淆“采购完成”和“已入库”
4. 批量操作栏不再保留旧“结案”语义

### 任务 5：统计与测试收口

目标：

1. 让统计页、摘要卡片、筛选口径接受新状态
2. 补齐关键测试

涉及：

- `/src/stores/useStatisticsStore.ts`
- `/src/views/Statistics.vue`
- `tests/order-*.js`
- `tests/procurement-*.test.*`

完成标准：

1. `arrived` 出现在状态统计中
2. 待处理单明确包含 `arrived`
3. 主要流转路径有测试覆盖

## 12. 推荐执行顺序

1. 任务 1：订单状态与字段扩展
2. 任务 2：后端状态流转与幂等修正
3. 任务 3：入库流水与库存更新
4. 任务 4：采购管理页状态与动作改造
5. 任务 5：统计与测试收口

## 13. 当前完成情况（2026-03-12）

已完成：

1. `Order` 状态已扩展为 `draft | submitted | processing | arrived | completed | cancelled`
2. `Order` 已新增 `arrived_* / stocked_in_*` 字段，前后端类型已同步
3. `OrderService` 已实现：
   - `processing -> arrived`
   - `arrived -> completed`
   - 非法状态流转拦截
   - 自动单取消后恢复到 `arrived` 的幂等键处理
4. `InventoryReceipt` 模型、`InventoryReceiptService`、`GET /api/inventory-receipts` 已落地
5. `POST /api/orders/:id/arrive` 与 `POST /api/orders/:id/stock-in` 已落地，并覆盖库存增量更新
6. 采购管理页已同步：
   - 行级操作“开始采购 / 登记到货 / 执行入库”
   - 批量操作栏同语义改造
   - 到货日期 / 入库日期显示
   - `arrived` 纳入待处理单统计与筛选
7. 统计页、摘要卡片、状态标签已同步到“已到货 / 已入库”口径
8. 库存页已增加“采购入库记录”展示区块，并支持按订单号定位查看
9. 采购页已增加“查看入库记录”入口，可跳转到库存页并带上订单号筛选

已补充修复：

1. 修复“登记到货”会清空既有 `delivery_date` 的回归问题
2. 修复空明细订单仍可被标记为 `completed` 的伪入库问题
3. 修复批量到货 / 批量入库部分成功时缺少明确回执的问题
4. 修复库存页“按订单查看入库记录”只写 query 不走服务端过滤的问题
5. 修复库存记录跳回采购页后不能按订单号定位的问题
6. 修复入库记录请求失败时静默保留旧数据的问题

当前仍未做：

1. 入库记录的独立详情页
2. 部分入库 / 反向撤销入库
3. 库存页中的入库记录分页、汇总统计与导出
