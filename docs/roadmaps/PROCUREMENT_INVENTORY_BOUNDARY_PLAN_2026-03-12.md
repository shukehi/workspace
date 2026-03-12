# 采购管理与库存管理边界改造计划（2026-03-12）

## 1. 目标

当前系统已经具备采购订单生成、提交、跟踪、打印和导出能力，但“采购完成”与“库存入库完成”仍混用同一个完成态，导致采购流程和库存流程的边界不清晰。

本计划的目标是：

1. 明确采购管理与库存管理的职责边界。
2. 将“到货”和“入库”从当前单一完成态中拆分出来。
3. 为库存数量更新建立可追踪的入库流水。
4. 在最小改造成本下，为后续库存闭环扩展提供稳定基础。

## 2. 当前问题

### 2.1 状态语义混用

当前订单状态为：

- `draft`
- `submitted`
- `processing`
- `completed`
- `cancelled`

问题：

1. 当前前端操作文案把 `completed` 解释成“结案入库”，但系统中并没有独立的到货或入库流水。
2. 后端当前只保存通用字符串状态，并未真正建立“采购完成”和“库存入库完成”的领域区分。
3. 采购执行完成和库存入库完成在页面语义上被混用。
4. 统计、页面按钮文案和库存更新边界容易出现歧义。

### 2.2 库存变更不可追踪

当前库存主要通过 `Material.stock_quantity` 表达汇总值，缺少采购入库流水表，导致：

1. 无法回答“哪张采购单把库存加上去的”。
2. 无法支持部分入库、补入库、回溯核对。
3. 库存变化的业务依据不足。

补充说明：

1. 当前库存模块本质上是“物料库存台账”，不是独立的采购入库子系统。
2. 现有 `/api/inventory` 只管理库存汇总值，不承载采购入库来源追踪。

### 2.3 模块边界不清晰

当前采购页已经承担：

- 订单生成
- 状态流转
- 打印 / 导出
- 风险识别

但“入库”这一动作实质上应属于库存管理，当前仍停留在采购页语义中。

## 3. 领域边界定义

### 3.1 属于采购管理的职责

- 生成采购订单
- 编辑采购订单
- 提交采购订单
- 供应商跟踪
- 催单 / 到货提醒
- 打印 / 导出 PDF
- 采购单状态流转

### 3.2 属于库存管理的职责

- 收货确认
- 入库登记
- 库存数量更新
- 入库流水记录
- 库存预警与库存台账

### 3.3 跨模块共享职责

- 订单状态与入库状态映射
- 物料主数据与 `material_id` 对照
- 打印 / 日期 / 命名契约
- 统计口径

## 4. 推荐状态模型

建议将订单状态扩展为：

- `draft`：草稿
- `submitted`：已提交
- `processing`：采购中
- `arrived`：已到货待入库
- `completed`：已入库完成
- `cancelled`：已取消

推荐流转：

```text
draft -> submitted
submitted -> processing
processing -> arrived
arrived -> completed

draft -> cancelled
submitted -> cancelled
processing -> cancelled
arrived -> cancelled

cancelled -> draft
```

约束：

1. `processing` 不再允许直接进入 `completed`。
2. `completed` 必须代表“库存已更新完成”，而不是“采购单处理完毕”。
3. 引入新状态前，必须同步审查自动采购单的幂等键生命周期与恢复路径。

## 5. 数据层最小改造

### 5.1 Order 扩展字段

建议在订单实体增加：

- `arrived_at`
- `arrived_by`
- `arrived_remark`
- `stocked_in_at`
- `stocked_in_by`
- `stocked_in_remark`

作用：

1. 区分“供应商到货时间”和“系统入库完成时间”。
2. 区分采购人员操作和仓库人员操作。
3. 支持异常情况备注。

### 5.2 新增入库流水表

建议新增 `InventoryReceipt`（或 `StockInRecord`）模型，至少包含：

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

原则：

1. 库存汇总值是结果，入库流水是依据。
2. 入库动作不能只修改 `stock_quantity` 而不记录流水。
3. 第一阶段不能只依赖 `order_item_id` 作为长期业务关联键，因为当前订单更新仍采用“删明细再重建”的策略。
4. 入库流水应至少冗余 `material_id`、`item_name`、`supplier`、`unit` 等业务字段，保证历史可追溯。

## 6. 接口层最小改造

建议新增以下接口：

### 6.1 标记到货

```http
POST /api/orders/:id/arrive
```

输入：

- `arrived_at`
- `operator`
- `remark`

行为：

1. 校验当前状态必须为 `processing`
2. 写入 `arrived_*`
3. 更新订单状态为 `arrived`

### 6.2 执行入库

```http
POST /api/orders/:id/stock-in
```

输入：

- `stocked_in_at`
- `operator`
- `remark`

行为：

1. 校验当前状态必须为 `arrived`
2. 创建入库流水
3. 按订单明细更新库存
4. 写入 `stocked_in_*`
5. 更新订单状态为 `completed`

### 6.3 查询入库记录

```http
GET /api/inventory-receipts
```

支持按 `orderId` / `orderNo` 过滤。

补充约束：

1. 新增状态或动作接口前，必须同步审查 `OrderService` 中与状态名耦合的幂等键恢复逻辑。
2. 当前自动单恢复路径已显式依赖状态名；若新增 `arrived`，必须补齐对应恢复分支与测试。

## 7. 前端页面改造建议

### 7.1 采购管理页

建议按钮语义调整为：

- `draft`：提交
- `submitted`：开始采购
- `processing`：登记到货
- `arrived`：执行入库
- `completed`：只读完成态

建议补充显示字段：

- `到货日期`
- `入库日期`

补充说明：

1. 第一阶段应先修正文案语义，再落状态扩展，避免 UI 先行误导。
2. 若暂不引入 `arrived` 状态，也应先把“结案入库”与“已完成”文案拆开评估。

### 7.2 库存管理页

第一阶段不做复杂改造，只增加“入库记录”视图即可。

建议字段：

- 入库日期
- 来源订单号
- 供应商
- 物料
- 数量
- 操作人
- 备注

## 8. 服务层拆分建议

### 8.1 OrderService

保留：

- 状态流转校验
- 到货动作
- 订单级别字段更新

### 8.2 新增 InventoryReceiptService

负责：

- 从订单生成入库流水
- 库存数量增量更新
- 入库事务控制

推荐编排：

```text
OrderService.stockInOrder(orderId, payload)
  -> 校验状态 = arrived
  -> InventoryReceiptService.createFromOrder(order, payload)
  -> InventoryReceiptService.applyStockDelta(order.items)
  -> 更新订单状态 = completed
```

补充说明：

1. 当前 `OrderService.updateOrder()` 在接收 `items` 更新时会删除旧明细并重新创建，这会影响明细级追踪设计。
2. 如果第一阶段不改明细更新策略，入库流水设计必须以“订单快照字段冗余”为主，而不是完全依赖外键回溯。

## 9. 实施顺序

第一阶段：

1. 扩展 `Order` 字段和状态
2. 新增 `InventoryReceipt` 模型
3. 实现 `arrive` / `stock-in` 接口
4. 同步修正自动单幂等逻辑与状态测试
5. 同步修正统计页、摘要卡片、状态标签和筛选口径

第二阶段：

1. 调整采购页状态按钮和文案
2. 增加到货日期 / 入库日期展示
3. 增加入库记录查询视图

第三阶段：

1. 统计页区分“采购处理中”和“待入库”
2. 接入库存预警与在途库存分析

## 10. 开发前强约束

本计划开始编码前，必须先确认以下事项：

1. `completed` 的正式语义固定为“已入库完成”。
2. 所有库存增加动作必须写入流水表。
3. 前端按钮文案、后端状态语义、统计口径必须一致。
4. 未完成状态定义前，不允许直接改采购页按钮行为。
5. 新状态设计必须同步评估 `OrderService` 幂等键恢复逻辑。
6. 明细级入库追踪设计必须考虑当前“删明细再重建”的实现限制。
