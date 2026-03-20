# 库存域正式出库与库位管理发布说明（2026-03-20）

> 状态：现行进度摘要。
> 用途：说明本轮库存域上线后的实际能力、数据结构变化与验证结果。

## Summary

本轮库存域交付重点不是“再加一个库存页面按钮”，而是把采购入库、库位余额、正式出库、出库冲销串成一条可审计闭环：

1. 采购入库现在必须落到明确库位
2. `Material.stock_quantity` 继续保留为总库存缓存
3. 库位余额通过独立表维护
4. 正式出库与出库冲销都通过库存流水执行，不再依赖手工改库存

## Delivered

### 1. 数据模型与迁移

已新增并接入以下结构：

1. `warehouses`
2. `inventory_locations`
3. `inventory_location_balances`
4. `inventory_outbounds`
5. `inventory_outbound_items`

同时：

1. `inventory_receipts` 已补充 `warehouse_id`、`location_id`
2. migration 会创建默认仓库 `DEFAULT` 和默认库位 `UNASSIGNED`
3. 历史 `materials.stock_quantity` 会回填到默认库位余额

## 2. 后端能力

当前库存域主接口已经包括：

1. `GET /api/inventory`
2. `GET /api/inventory-receipts`
3. `GET /api/inventory-receipts/:id`
4. `POST /api/inventory-receipts/:id/reverse`
5. `GET /api/inventory-locations`
6. `POST /api/inventory-locations`
7. `PUT /api/inventory-locations/:id`
8. `GET /api/inventory-outbounds`
9. `GET /api/inventory-outbounds/:id`
10. `POST /api/inventory-outbounds`
11. `POST /api/inventory-outbounds/:id/reverse`

行为约束：

1. 正式出库只允许从单个库位扣减
2. 出库冲销会创建反向单据回补原库位余额和总库存
3. 入库撤销会回滚原库位余额，并同步回退订单累计收货状态
4. `PUT /api/inventory/:id` 仍保留兼容，但不再是正式仓库流程

## 3. 前端能力

库存页现已拆为四个 tab：

1. 物料库存
2. 采购入库记录
3. 正式出库记录
4. 库位管理

其中：

1. 物料库存支持仓库/库位筛选、低库存筛选、库位余额导出、发起正式出库
2. 采购入库记录支持分页、筛选、全量导出、撤销轨迹与详情查看
3. 正式出库记录支持筛选、详情查看、冲销、全量导出
4. 库位管理支持新增、编辑、停用

采购页同步变化：

1. 到货支持单张到货与批量到货
2. 入库弹窗新增仓库/库位选择
3. 队列入库增加“全入当前单并下一单”快捷动作

## 4. 工程基线

本轮完成后，当前主线验证状态为：

1. `npm run type-check` 通过
2. `npm run type-check:server` 通过
3. `npm test` 通过

最新一次全量测试结果：

1. `302 pass`
2. `1 skip`
3. `0 fail`

## 5. 仍保留的兼容点

1. `PUT /api/inventory/:id` 仍存在，仅用于兼容旧入口和特殊修复，不属于正式仓库流程
2. 默认仓库/默认库位仍作为历史数据与未显式指定库位场景的兜底
3. 前端跨页联动仍有一部分依赖浏览器 `storage` 信号，后续可再收敛
