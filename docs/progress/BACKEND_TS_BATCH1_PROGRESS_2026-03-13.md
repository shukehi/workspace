# 后端 TypeScript 第一批迁移进度（2026-03-13）

> 状态：进行中计划。
> 对应任务：`docs/governance/BACKEND_TYPESCRIPT_MIGRATION_TASKS_2026-03-13.md` 中“第一批：订单 / 库存 / 物料主链路”。

## 1. 目标范围

本批目标是固定“订单 / 库存 / 物料”主链路的模型与 repository 类型边界。

计划范围：

1. `server/models/types.ts`
2. `server/models/Material.ts`
3. `server/models/OrderIdempotencyKey.ts`
4. `server/models/InventoryReceipt.ts`
5. `server/models/OrderItem.ts`
6. `server/models/Order.ts`
7. `server/models/index.ts`
8. `server/services/inventory/inventory.repository.ts`
9. `server/services/inventory/inventory-receipt.repository.ts`
10. `server/services/orders/order.repository.ts`

## 2. 当前进度

当前状态：

1. 已创建迁移分支：`codex/backend-ts-batch1`
2. 已完成迁移策略文档与任务拆解文档
3. 尚未开始第一批代码迁移

## 3. 已完成项

当前暂无代码迁移完成项。

## 4. 当前建议顺序

1. 新增 `server/models/types.ts`
2. 迁 `Material`
3. 迁 `OrderIdempotencyKey`
4. 迁 `InventoryReceipt`
5. 迁 `OrderItem`
6. 迁 `Order`
7. 迁 `server/models/index.ts`
8. 迁 repository

## 5. 当前约束

本批默认不做：

1. 不修改数据库 schema
2. 不修改 migration
3. 不修改 route / controller
4. 不顺手重构 service 主流程
5. 不把所有测试改成 TypeScript

## 6. 当前验证要求

本批定向验证至少包括：

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`

## 7. 记录模板

后续每完成一个小步，建议追加记录：

1. 本次迁移文件：
2. 是否有运行链路调整：
3. 是否有类型策略变更：
4. 已执行验证：
5. 遇到的问题：
6. 下一步：

## 8. 下一步入口

建议下一步从：

1. 新增 `server/models/types.ts`

开始，先建立第一批模型的公共 `Attributes / CreationAttributes` 基础类型。
