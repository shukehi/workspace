# 后端 TypeScript 第四批迁移进度（2026-03-13）

> 状态：阶段计划，准备中。
> 对应任务：`docs/governance/BACKEND_TYPESCRIPT_MIGRATION_TASKS_2026-03-13.md` 中“第四批：shared / validator / rule helpers”。

## 1. 目标范围

本批目标是收口后端高复用的共享契约、校验器和纯逻辑 helper，为后续新增后端模块默认 TS 化提供稳定底座。

当前建议范围：

1. `server/shared/contracts/api.ts`
2. `server/shared/contracts/pagination.ts`
3. `server/shared/constants/order.ts`
4. `server/validators/order.validators.ts`
5. `server/validators/inventory.validators.ts`
6. `server/validators/inventory-receipt.validators.ts`
7. `server/services/orders/order.policy.ts`
8. `server/services/orders/order.mapper.ts`
9. `server/services/orders/order.dedupe.ts`
10. `server/services/inventory/inventory.mapper.ts`
11. `server/services/inventory/inventory-receipt.mapper.ts`
12. `server/services/inventory/inventory-receipt.policy.ts`
13. `server/services/inventory/inventory-receipt.query-policy.ts`
14. `server/services/mappings/mapping.constants.ts`
15. `server/services/mappings/mapping.mapper.ts`
16. `server/services/mappings/mapping.validator.ts`

## 2. 准备结论

当前已确认：

1. 第四批主文件都属于纯逻辑、轻依赖或共享契约层
2. 这些文件大多不直接写数据库，也不主导主编排流程
3. 它们更适合按“共享契约 -> validator -> helper”顺序分段迁移
4. `inventory` 目录里已有拆出来的 `mapper / policy / query-policy`，应纳入第四批，而不是只盯 `orders` 和 `mappings`

## 3. 推荐子批次

推荐按 4 个子段推进：

1. A 段：shared contracts / shared constants
   - `server/shared/contracts/api.ts`
   - `server/shared/contracts/pagination.ts`
   - `server/shared/constants/order.ts`
2. B 段：validators
   - `server/validators/order.validators.ts`
   - `server/validators/inventory.validators.ts`
   - `server/validators/inventory-receipt.validators.ts`
   - `server/services/mappings/mapping.validator.ts`
3. C 段：orders / inventory pure helpers
   - `server/services/orders/order.policy.ts`
   - `server/services/orders/order.mapper.ts`
   - `server/services/orders/order.dedupe.ts`
   - `server/services/inventory/inventory.mapper.ts`
   - `server/services/inventory/inventory-receipt.mapper.ts`
   - `server/services/inventory/inventory-receipt.policy.ts`
   - `server/services/inventory/inventory-receipt.query-policy.ts`
4. D 段：mappings pure helpers
   - `server/services/mappings/mapping.constants.ts`
   - `server/services/mappings/mapping.mapper.ts`

## 4. 当前约束

本批默认不做：

1. 不重写业务规则
2. 不调整 API 出参语义
3. 不顺手重构 service 主流程
4. 不修改数据库 schema
5. 不修改 controller / route 层

## 5. 当前验证建议

第四批准备阶段建议优先依赖这些测试：

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`
4. `tests/mapping-validator.test.ts`
5. `tests/mapping-server-validator.test.js`
6. `tests/shared-mapping-core.test.js`
7. `npm run type-check:server`
8. `npm test`

## 6. 下一步入口

建议从第四批 A 段开始：

1. 先迁 `server/shared/contracts/api.js`
2. 再迁 `server/shared/contracts/pagination.js`
3. 再迁 `server/shared/constants/order.js`

原因：

1. 依赖范围小
2. 返回结构稳定
3. 最容易先建立第四批的迁移模式
