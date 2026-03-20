# 后端 TypeScript 迁移任务拆解（2026-03-13）

> 状态：**已完成**（2026-03-19 全部阶段落地，所有 server JS 已迁移为 TS，TS 专项优化 Phase 7 已合并）
> 对应策略：`docs/governance/BACKEND_TYPESCRIPT_MIGRATION_STRATEGY_2026-03-13.md`

## 1. 使用方式

本文件用于把后端 TypeScript 渐进迁移拆成可小步推进的任务批次。

使用原则：

1. 每一批都应可独立提交
2. 每一批都应有明确“不做什么”
3. 每一批都应有最小验证范围
4. 迁移过程中不顺手叠加业务语义改造

## 2. 总体顺序

建议按以下顺序推进：

1. 第一批：订单 / 库存 / 物料模型与 repository
2. 第二批：配方模型与 repository
3. 第三批：mapping / materials catalog 模型与 repository
4. 第四批：shared contract / validator / policy / mapper 收口

## 3. 第一批：订单 / 库存 / 物料主链路

### 3.1 目标

固定当前最核心的真实数据链路类型边界：

1. 订单
2. 订单明细
3. 入库流水
4. 幂等键
5. 物料

### 3.2 建议文件

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

### 3.3 推荐子顺序

1. 新增 `server/models/types.ts`
2. 迁 `Material`
3. 迁 `OrderIdempotencyKey`
4. 迁 `InventoryReceipt`
5. 迁 `OrderItem`
6. 迁 `Order`
7. 迁 `server/models/index.ts`
8. 迁 repository

### 3.4 本批不做

1. 不修改数据库 schema
2. 不修改 migration
3. 不修改 route / controller
4. 不顺手重构 service 主流程
5. 不把所有测试改成 TypeScript

### 3.5 最小验证

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`

## 4. 第二批：配方模型与 repository

### 4.1 目标

固定配方 workflow 的定义、revision 和 audit 结构。

### 4.2 建议文件

1. `server/models/FormulaDefinition.ts`
2. `server/models/FormulaRevision.ts`
3. `server/models/FormulaAuditLog.ts`
4. `server/services/formulas/formula.repository.ts`

### 4.3 本批不做

1. 不调整 formulas 业务语义
2. 不顺手重写 workflow
3. 不顺手调整前端配方流程

### 4.4 最小验证

1. `tests/formula-workflow.test.js`
2. `tests/formula-validator.test.js`
3. 相关 `npm test` 主链路回归

## 5. 第三批：mapping / materials catalog

### 5.1 目标

固定 revision/profile 型配置工作流的后端类型边界。

### 5.2 建议文件

1. `server/models/MappingProfile.ts`
2. `server/models/MappingRevision.ts`
3. `server/models/MappingAuditLog.ts`
4. `server/models/MappingUnmatchedEvent.ts`
5. `server/models/MaterialCatalogProfile.ts`
6. `server/models/MaterialCatalogRevision.ts`
7. `server/models/MaterialCatalogAuditLog.ts`
8. `server/services/mappings/mapping.repository.ts`
9. `server/services/materials/materialCatalog.repository.ts`

### 5.3 本批不做

1. 不修改 published/draft workflow 语义
2. 不修改 mapping 规则本身
3. 不顺手重构 route 层

### 5.4 最小验证

1. `tests/mapping-repository.test.js`
2. `tests/mapping-workflow.test.js`
3. `tests/materials-workflow.test.js`
4. `tests/config-routes.test.js`

## 6. 第四批：shared / validator / rule helpers

### 6.1 目标

收口后端高复用的共享契约和纯逻辑层，提升后续新模块默认 TS 化能力。

### 6.2 建议文件

1. `server/shared/contracts/*.ts`
2. `server/shared/constants/*.ts`
3. `server/validators/*.ts`
4. `server/services/orders/order.policy.ts`
5. `server/services/orders/order.mapper.ts`
6. `server/services/orders/order.dedupe.ts`
7. `server/services/inventory/*policy*.ts`
8. `server/services/mappings/mapping.mapper.ts`
9. `server/services/mappings/mapping.constants.ts`

### 6.3 本批不做

1. 不重写业务规则
2. 不修改外部接口契约
3. 不顺手做 controller/service 大重构

### 6.4 最小验证

1. `npm test`
2. `npm run type-check`
3. 对应领域定向测试

## 7. 每批通用检查点

每一批迁移都要检查：

1. 是否只做类型迁移和最小必要接线
2. 是否顺手引入了业务语义变化
3. 是否影响真实数据链路
4. 是否补了最小验证
5. 是否可以单独回退

## 8. 完成标记建议

每一批完成后，至少记录：

1. 已迁文件
2. 未迁文件
3. 当前阻塞点
4. 已执行验证
5. 下一批入口

## 9. 当前默认推进方式

当前后端 TypeScript 迁移默认采用：

1. 小步提交
2. 模型优先
3. repository 跟进
4. 运行链路保守
5. 文档同步更新
