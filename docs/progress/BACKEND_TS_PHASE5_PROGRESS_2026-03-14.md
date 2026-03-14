# 后端 TypeScript 第五阶段进度（2026-03-14）

> 状态：阶段计划，部分已落地。
> 对应建议：`docs/governance/BACKEND_TYPESCRIPT_NEXT_PHASE_RECOMMENDATIONS_2026-03-13.md`

## 1. 目标

第五阶段不再是原定 4 批迁移的一部分，而是在既有稳定基线上继续降低后端维护成本。

当前第一步目标：

1. `server/services/formulas/formula.validator.ts`
2. `server/services/formulas/formula.mapper.ts`

## 2. 当前进度

当前状态：

1. 已从 `main` 新建第五阶段分支：`codex/backend-ts-phase5`
2. 已确定第五阶段从 formulas 纯 helper 开始
3. 已完成第一步代码迁移：
   - `server/services/formulas/formula.validator.ts`
   - `server/services/formulas/formula.mapper.ts`
4. 已完成第二步代码迁移：
   - `server/services/formulas/formula.workflow.ts`
5. 已完成第三步第一小步：
   - `server/services/inventory/inventory.service.ts`
6. 已完成第三步第二小步：
   - `server/services/inventory/inventory-receipt.service.ts`
7. 已完成第四步：
   - `server/services/orders/order.stockin.ts`
8. 已完成第五步：
   - `server/services/orders/order.query-policy.ts`
   - `server/services/orders/order.errors.ts`
   - `server/services/orders/order.service.ts`

## 3. 当前约束

本阶段当前仍不做：

1. 不修改 formulas workflow 语义
2. 不顺手改 route / controller
3. 不修改数据库 schema
4. 不扩大到新的高副作用模块
5. 订单主编排迁移时，保持现有行为和导出结构不变

## 4. 当前验证

当前第一步最小验证：

1. `tests/formula-validator.test.js`
2. `tests/formula-workflow.test.js`
3. `npm run type-check:server`
4. `tests/inventory-route.test.js`
5. `tests/order-service.test.js`
6. `tests/order-routes.test.js`
