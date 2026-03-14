# 后端 TypeScript 第一批完成总结（2026-03-13）

> 状态：现行参考文档。
> 对应提交：`a351af6`

## 1. 本批目标

第一批的目标是固定“订单 / 库存 / 物料”主链路的模型与 repository 类型边界，在不改数据库 schema、不改业务语义的前提下，为后续后端 TypeScript 迁移建立可持续的接线方式。

## 2. 实际完成范围

本批完成了以下内容：

1. 新增后端公共模型类型文件：`server/models/types.ts`
2. 新增后端 TypeScript 检查配置：`tsconfig.server.json`
3. 新增后端类型检查脚本：`npm run type-check:server`
4. 将后端运行脚本切换到 `tsx`
5. 迁移以下模型：
   - `server/models/Material.ts`
   - `server/models/OrderIdempotencyKey.ts`
   - `server/models/InventoryReceipt.ts`
   - `server/models/OrderItem.ts`
   - `server/models/Order.ts`
   - `server/models/index.ts`
6. 迁移以下 repository：
   - `server/services/inventory/inventory.repository.ts`
   - `server/services/inventory/inventory-receipt.repository.ts`
   - `server/services/orders/order.repository.ts`

## 3. 最关键产出

本批真正建立的不是单个 `.ts` 文件，而是后端渐进迁移的最小可行模式：

1. 保留 JS 入口
2. 通过 `tsx` 逐步加载 `.ts` 模块
3. 通过 `tsconfig.server.json` 单独检查后端 TypeScript
4. 先固定模型与 repository 边界，再继续向上层推进

## 4. 本批避免了什么

本批明确没有做：

1. 不修改数据库 schema
2. 不修改 migration
3. 不修改 route / controller
4. 不顺手重构 service 主流程
5. 不修改业务语义

这使得本批提交可以被视为“类型收口 + 最小接线”，而不是高风险重构。

## 5. 实际踩到的兼容点

本批最关键的兼容点是：

1. JS 测试仍然通过 `node --test` 运行
2. 当 `server/models/index.js` 被迁成 `index.ts` 后，原生 Node 测试无法直接 `require('../server/models')`

本批最终采用的解决方式是：

1. JS 测试改为 `node --require tsx/cjs --test`

这保持了：

1. 现有 JS 测试文件不必一起迁移
2. 后端 `.ts` 模块可以被 CJS 测试链路加载
3. 迁移成本维持在当前批次可控范围内

## 6. 验证结果

本批已执行：

1. `npm run type-check:server`
2. `node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.js tests/order-routes.test.js tests/inventory-route.test.js`
3. `npm test`

结果：

1. 第一批定向测试通过：53 / 53
2. 全量测试通过：135 / 135，skip 1

## 7. 当前结论

第一批已经证明：

1. 当前仓库可以在不重写后端运行方式的前提下，渐进迁移后端 `.ts` 模块
2. “模型 + repository 优先”的迁移顺序是可行的
3. 在当前项目节奏下，后端 TypeScript 迁移可以和正常开发并行推进

## 8. 对第二批的建议

第二批建议继续按原计划推进 formulas：

1. `server/models/FormulaDefinition.ts`
2. `server/models/FormulaRevision.ts`
3. `server/models/FormulaAuditLog.ts`
4. `server/services/formulas/formula.repository.ts`

第二批仍应继续遵守：

1. 不改业务语义
2. 不改 workflow 规则
3. 不顺手重构 route / controller
4. 先做模型与 repository，后看是否扩展到更高层
