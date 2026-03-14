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
5. 已完成第二步 (基础设施兼容性加固)：
   - `server/app/errors/errorCodes.ts`
   - `server/app/errors/AppError.ts`
   - `server/app/errors/normalizeError.ts`
   - `server/app/http/response.ts`
   - `server/app/middleware/validateRequest.ts`
   - 注：已全部补齐 `module.exports` 兼容层，支持存量 JS 路由调用。
6. 已完成第三步：
   - `server/services/inventory/inventory-receipt.errors.ts`
   - `server/services/orderItemKey.ts`
7. 已完成第四步 (物料模块深度重构)：
   - `server/services/materials/material.repository.ts` (新建 Repository)
   - `server/services/MaterialService.ts` (TS 迁移 + 注入)
   - 注：实现了 [精确 -> 别名 -> 模糊] 三级智能匹配梯度，解决了 SQL 注入风险及数据一致性问题。

## 3. 当前约束
... (保持不变)

## 4. 当前验证

当前已通过验证项：

1. `tests/mapping-workflow.test.js`
2. `tests/mapping-routes.test.js`
3. `tests/materials-workflow.test.js`
4. `tests/material-smart-match.test.ts` (新建，验证三级匹配梯度)
5. `tests/order-routes.test.js` (验证基础设施兼容性)
6. `tests/inventory-route.test.js`
7. `npm run type-check:server`

