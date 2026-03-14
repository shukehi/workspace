# 后端 TypeScript 第六阶段进度（2026-03-14）

> 状态：阶段计划，部分已落地。
> 对应规划：`docs/governance/BACKEND_TYPESCRIPT_PHASE6_PLAN_2026-03-14.md`

## 1. 目标

第六阶段进入“收尾与增量治理”模式，不再追求大批量迁移。

当前第一步目标：

1. `server/services/mappings/mapping.workflow.ts`
2. `server/services/materials/materialCatalog.workflow.ts`

## 2. 当前进度

当前状态：

1. 已从 `main` 新建第六阶段分支：`codex/backend-ts-phase6`
2. 已确认第六阶段第一优先级仍是 workflow 收口
3. 已完成第一步第一小步：
   - `server/services/mappings/mapping.workflow.ts`
4. 已完成第一步第二小步：
   - `server/services/materials/materialCatalog.workflow.ts`
5. 已完成第二步：
   - `server/app/errors/errorCodes.ts`
   - `server/app/errors/AppError.ts`
   - `server/app/errors/normalizeError.ts`
   - `server/app/http/response.ts`
   - `server/app/middleware/validateRequest.ts`
6. 已完成第三步：
   - `server/services/inventory/inventory-receipt.errors.ts`
   - `server/services/orderItemKey.ts`

## 3. 当前约束

本阶段当前仍不做：

1. 不改 route / controller
2. 不改数据库 schema
3. 不改 migration / scripts
4. 不把 app 入口和 config 纳入本阶段
5. workflow 迁移时保持现有行为和导出结构不变
6. app 错误与响应基础设施迁移时保持现有错误码和 envelope 结构不变

## 4. 当前验证

当前第一步最小验证：

1. `tests/mapping-workflow.test.js`
2. `tests/mapping-routes.test.js`
3. `npm run type-check:server`
4. `tests/materials-workflow.test.js`
5. `tests/config-routes.test.js`
6. `tests/shared-contracts.test.ts`
7. `tests/order-routes.test.js`
8. `tests/inventory-route.test.js`
9. `tests/mapping-routes.test.js`
10. `tests/order-service.test.js`
