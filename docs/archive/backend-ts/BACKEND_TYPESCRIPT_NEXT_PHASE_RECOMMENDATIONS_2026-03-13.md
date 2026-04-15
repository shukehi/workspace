# 后端 TypeScript 下一阶段建议（2026-03-13）

> 状态：历史阶段建议。
> 适用时机：原定 4 批迁移已完成后，用于判断是否继续扩展后端 TypeScript 覆盖范围。
> 说明：本建议已在 2026-03-14 的第五阶段中完成主要落实；后续请改读 `docs/archive/backend-ts/BACKEND_TYPESCRIPT_PHASE6_PLAN_2026-03-14.md`。

## 1. 当前判断

原定 4 批迁移已经完成，当前仓库后端的模型、repository、shared contract、validator、policy、mapper 等核心低风险层已经基本收口。

此时如果继续推进，不建议再按“第五批、 第六批”机械扩张，而应按“收益是否明显高于运行风险”来判断。

## 2. 当前不建议优先继续迁的范围

这些区域短期内不建议作为优先目标：

1. `server/index.js`
2. `server/config/*.js`
3. `server/routes/*.js`
4. `server/controllers/*.js`
5. `server/db/migrate.js`
6. `server/db/migrations/*.js`
7. `server/scripts/*.js`
8. 兼容壳文件：
   - `server/services/OrderService.js`
   - `server/services/FormulaService.js`
   - `server/services/InventoryReceiptService.js`

原因：

1. 运行时耦合更强
2. 类型收益不如 service/workflow 主流程明显
3. 迁移它们更容易把运行链路一起搅动

## 3. 最值得继续处理的 10 个文件

### 第一优先级

1. `server/services/orders/order.service.js`
2. `server/services/orders/order.stockin.js`
3. `server/services/inventory/inventory-receipt.service.js`
4. `server/services/inventory/inventory.service.js`

原因：

1. 它们是当前订单 / 库存主编排链路
2. 已经建立在已迁移的 models / repository / helper 之上
3. 继续迁移时类型收益会直接外溢到真实业务链路

### 第二优先级

5. `server/services/formulas/formula.validator.js`
6. `server/services/formulas/formula.mapper.js`
7. `server/services/formulas/formula.workflow.js`

原因：

1. `validator` 和 `mapper` 是纯逻辑，迁移成本低
2. 先收口 pure helper，再推进 workflow，会比直接动 workflow 更稳

### 第三优先级

8. `server/services/mappings/mapping.workflow.js`
9. `server/services/materials/materialCatalog.workflow.js`
10. `server/services/orders/order.query-policy.js`

原因：

1. 底层 repository / validator / mapper 已经 TS 化
2. workflow 层已具备继续迁移的基础
3. `order.query-policy` 是低风险补强项

## 4. 推荐顺序

如果继续推进，建议按以下顺序：

1. `formula.validator.js`
2. `formula.mapper.js`
3. `formula.workflow.js`
4. `inventory.service.js`
5. `inventory-receipt.service.js`
6. `order.stockin.js`
7. `order.query-policy.js`
8. `order.service.js`
9. `mapping.workflow.js`
10. `materialCatalog.workflow.js`

## 5. 当前阶段仍然不做的事

继续扩展 TS 时，仍然保持这些约束：

1. 不顺手修改数据库 schema
2. 不顺手重写 route / controller
3. 不顺手更改 API 对外契约
4. 不顺手调整 migration 运行方式
5. 不把脚本和 migration 当成主目标

## 6. 建议的推进方式

下一阶段不建议一次性铺开。

建议方式：

1. 先开新分支
2. 先选 1 到 2 个最相关文件
3. 每一组迁移都独立验证
4. 每一步都可单独回退

## 7. 当前结论

如果接下来主要目标是继续业务开发：

1. 不必立刻继续扩展后端 TS
2. 当前 4 批成果已经足够作为稳定基线

如果接下来主要目标是继续降低后端维护成本：

1. 优先从 `formula.validator.js` 和 `formula.mapper.js` 开始
2. 然后再推进 `formula.workflow.js`

这是当前最稳的继续路径。
