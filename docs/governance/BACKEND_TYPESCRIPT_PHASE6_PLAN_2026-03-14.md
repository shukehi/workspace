# 后端 TypeScript 第六阶段规划（2026-03-14）

> 状态：**历史计划（已完成）**。server/ 目录已于 2026-03-19 全部迁移为 `.ts`（v1.1.3/v1.1.4），本文档列举的所有目标文件均已完成迁移，不再作为待执行计划依据。

## 1. 当前判断

前 1 到 5 阶段已经完成了以下高收益区域：

1. models
2. repository
3. shared contracts / constants
4. validators / mapper / policy
5. formulas / inventory / orders 主流程 service

因此，第六阶段不再适合沿用“大批量迁移”思路，而应进入“收尾与增量治理”模式。

第六阶段的目标不是追求 `server/` 全量 `.ts`，而是：

1. 继续迁少量高复用、已具备 TS 基座的后端模块
2. 明确保留 JS 的范围，避免为了统一而扰动运行链路
3. 让后续新增模块的 JS / TS 选择有更稳定依据

## 2. 当前剩余后端 JS 分类

### A. 建议继续评估迁移的高价值模块

1. `server/services/mappings/mapping.workflow.js`
2. `server/services/materials/materialCatalog.workflow.js`
3. `server/app/errors/AppError.js`
4. `server/app/errors/errorCodes.js`
5. `server/app/errors/normalizeError.js`
6. `server/app/http/response.js`
7. `server/app/middleware/validateRequest.js`
8. `server/services/inventory/inventory-receipt.errors.js`
9. `server/services/orderItemKey.js`

### B. 暂不建议优先迁移的运行入口层

1. `server/index.js`
2. `server/config/*.js`
3. `server/routes/*.js`
4. `server/controllers/*.js`
5. `server/app/middleware/asyncHandler.js`
6. `server/app/middleware/errorHandler.js`
7. `server/app/middleware/notFound.js`

### C. 应继续保留 JS 的脚本 / migration

1. `server/db/migrate.js`
2. `server/db/migrations/*.js`
3. `server/scripts/*.js`

### D. 兼容壳 / 索引壳

1. `server/services/OrderService.js`
2. `server/services/FormulaService.js`
3. `server/services/InventoryReceiptService.js`
4. `server/services/MaterialService.js`
5. `server/services/*/index.js`
6. `server/config/index.js`
7. `server/routes/index.js`

### E. 当前低优先级专项服务

1. `server/services/erpService.js`
2. `server/services/ContractCacheService.js`
3. `server/services/pdfGenerator.js`
4. `server/services/renderBaseUrl.js`
5. `server/services/printSnapshotStore.js`
6. `server/models/ErpContract.js`

## 3. 第六阶段建议范围

如果继续推进，第六阶段建议只覆盖下面 3 组。

### 第一组：workflow 收口

1. `server/services/mappings/mapping.workflow.js`
2. `server/services/materials/materialCatalog.workflow.js`

原因：

1. 底层 repository / mapper / validator / constants 已经完成 TS 化
2. 这两处仍是明显的后端业务编排中心
3. 收益高于 route / controller / 入口层

### 第二组：应用层错误与响应基础设施

1. `server/app/errors/AppError.js`
2. `server/app/errors/errorCodes.js`
3. `server/app/errors/normalizeError.js`
4. `server/app/http/response.js`
5. `server/app/middleware/validateRequest.js`

原因：

1. 这些文件跨 route / controller / service 复用
2. 类型收益主要体现在错误结构、响应包裹结构、请求校验输出
3. 迁移它们比直接迁 route / controller 更稳

### 第三组：零散高复用纯逻辑

1. `server/services/inventory/inventory-receipt.errors.js`
2. `server/services/orderItemKey.js`

原因：

1. 纯逻辑或近似纯逻辑
2. 迁移成本低
3. 可作为第二组前后的补强项

## 4. 第六阶段不建议纳入的范围

本阶段仍然明确不做：

1. `server/index.js`
2. `server/routes/*.js`
3. `server/controllers/*.js`
4. `server/config/*.js`
5. `server/db/migrate.js`
6. `server/db/migrations/*.js`
7. `server/scripts/*.js`
8. `server/services/erpService.js`
9. `server/services/pdfGenerator.js`
10. `server/services/printSnapshotStore.js`

原因：

1. 运行时耦合或环境依赖更强
2. 类型收益不如 workflow / app 基础设施明显
3. 容易把部署、IO、脚本执行方式一起搅动

## 5. 推荐顺序

如果启动第六阶段，建议按下面顺序推进：

1. `server/services/mappings/mapping.workflow.js`
2. `server/services/materials/materialCatalog.workflow.js`
3. `server/app/errors/errorCodes.js`
4. `server/app/errors/AppError.js`
5. `server/app/errors/normalizeError.js`
6. `server/app/http/response.js`
7. `server/app/middleware/validateRequest.js`
8. `server/services/inventory/inventory-receipt.errors.js`
9. `server/services/orderItemKey.js`

## 6. 推进方式

第六阶段应继续保持小步推进：

1. 每次只处理 1 到 2 个强相关文件
2. 每一步单独验证，不把 route / controller 改动混进来
3. 先迁 workflow，再迁应用层基础设施
4. 如果真实使用中没有明显痛点，可以停在任意一步，不强求做完整阶段

## 7. 当前结论

第六阶段值得规划，但不应默认立刻开始。

当前更准确的判断是：

1. 第六阶段已经有明确候选范围
2. 第六阶段不是必须马上执行
3. 如果继续做，优先从 `mapping.workflow.js` 和 `materialCatalog.workflow.js` 开始
