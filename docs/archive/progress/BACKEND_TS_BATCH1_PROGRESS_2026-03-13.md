# 后端 TypeScript 第一批迁移进度（2026-03-13）

> 状态：阶段计划，部分已落地。
> 对应任务：`docs/archive/backend-ts/BACKEND_TYPESCRIPT_MIGRATION_TASKS_2026-03-13.md` 中“第一批：订单 / 库存 / 物料主链路”。

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
3. 已完成第一步公共类型文件：`server/models/types.ts`
4. 已切换后端运行脚本到 `tsx`，为逐步加载 `.ts` 模块提供最小接线
5. 已完成第一个真实模型迁移：`server/models/Material.ts`
6. 已完成第二个真实模型迁移：`server/models/OrderIdempotencyKey.ts`
7. 已完成第三个真实模型迁移：`server/models/InventoryReceipt.ts`
8. 已完成第四个真实模型迁移：`server/models/OrderItem.ts`
9. 已完成第五个真实模型迁移：`server/models/Order.ts`
10. 已完成模型汇总入口迁移：`server/models/index.ts`
11. 已完成第一个 repository 迁移：`server/services/inventory/inventory.repository.ts`
12. 已完成第二个 repository 迁移：`server/services/inventory/inventory-receipt.repository.ts`
13. 已完成第三个 repository 迁移：`server/services/orders/order.repository.ts`
14. 第一批计划范围内的 10 个目标文件已完成迁移

## 3. 已完成项

已完成：

1. 新增 `server/models/types.ts`
2. 固定第一批核心模型的基础 `Attributes / CreationAttributes` 类型
3. 新增 `tsconfig.server.json` 与 `npm run type-check:server`
4. 后端运行脚本已切到 `tsx`，保持 JS 入口不变
5. 已将 `server/models/Material.js` 迁移为 `server/models/Material.ts`
6. 已将 `server/models/OrderIdempotencyKey.js` 迁移为 `server/models/OrderIdempotencyKey.ts`
7. 已将 `server/models/InventoryReceipt.js` 迁移为 `server/models/InventoryReceipt.ts`
8. 已将 `server/models/OrderItem.js` 迁移为 `server/models/OrderItem.ts`
9. 已将 `server/models/Order.js` 迁移为 `server/models/Order.ts`
10. 已将 `server/models/index.js` 迁移为 `server/models/index.ts`
11. 已将 `server/services/inventory/inventory.repository.js` 迁移为 `server/services/inventory/inventory.repository.ts`
12. 已将 `server/services/inventory/inventory-receipt.repository.js` 迁移为 `server/services/inventory/inventory-receipt.repository.ts`
13. 已将 `server/services/orders/order.repository.js` 迁移为 `server/services/orders/order.repository.ts`
14. 已执行 `npm run type-check:server`
15. 已执行 `node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.js tests/order-routes.test.js tests/inventory-route.test.js`
16. 上述定向测试全部通过（53/53）
17. 当前未改动数据库 schema 和业务语义

## 4. 当前建议顺序

1. 新增 `server/models/types.ts`
2. 迁 `Material`
3. 迁 `OrderIdempotencyKey`
4. 迁 `InventoryReceipt`
5. 迁 `OrderItem`
6. 迁 `Order`
7. 迁 `server/models/index.ts`
8. 迁 repository

当前结果：

1. 上述顺序已执行完成

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

1. 评估是否提交第一批迁移
2. 如继续扩展，准备第二批（formulas）进度文档与代码迁移入口

开始，进入下一批前，先收敛本批提交边界。
