# 采购与库存边界改造第一阶段变更清单（2026-03-12）

## 1. 目标

本清单用于把“采购管理与库存管理边界改造计划”落到可开发的最小实现范围，覆盖：

1. 状态扩展
2. 订单字段扩展
3. 入库流水建模
4. 接口改造
5. 前端状态/文案/统计同步

本阶段目标不是一次性完成完整库存子系统，而是建立“到货”和“入库”两个明确节点，并保证库存变更可追踪。

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
- `/src/views/Procurement.vue`
- `/src/features/procurement/useProcurementPageState.ts`

必须同步：

1. 状态显示文案
2. 状态按钮行为
3. 筛选项
4. 到货日期 / 入库日期列

### 6.2 统计页与统计 store

文件：

- `/src/stores/useStatisticsStore.ts`
- `/src/views/Statistics.vue`

必须同步：

1. `pendingOrdersCount` 口径
2. `statusStats` 枚举
3. 状态标签与颜色映射
4. 描述文案“等待后续入库处理”的含义

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
