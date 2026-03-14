# 后端 TypeScript 第二批迁移进度（2026-03-13）

> 状态：阶段计划，部分已落地。
> 对应任务：`docs/governance/BACKEND_TYPESCRIPT_MIGRATION_TASKS_2026-03-13.md` 中“第二批：配方模型与 repository”。

## 1. 目标范围

本批目标是固定 formulas workflow 的定义、revision 和 audit 结构，并将配方 repository 迁为 TypeScript。

计划范围：

1. `server/models/FormulaDefinition.ts`
2. `server/models/FormulaRevision.ts`
3. `server/models/FormulaAuditLog.ts`
4. `server/services/formulas/formula.repository.ts`

## 2. 当前进度

当前状态：

1. 第一批（订单 / 库存 / 物料）已完成并提交
2. 已完成第二批第一步类型预备：在 `server/models/types.ts` 中补 formulas 类型
3. 已完成第二批第一个真实模型迁移：`server/models/FormulaDefinition.ts`
4. 已完成第二批第二个真实模型迁移：`server/models/FormulaRevision.ts`
5. 已完成第二批第三个真实模型迁移：`server/models/FormulaAuditLog.ts`
6. 已完成第二批 repository 迁移：`server/services/formulas/formula.repository.ts`
7. 第二批计划范围内的 4 个目标文件已完成迁移

## 3. 已完成项

已完成：

1. 已在 `server/models/types.ts` 中补充：
   - `FormulaDefinitionAttributes / CreationAttributes`
   - `FormulaRevisionAttributes / CreationAttributes`
   - `FormulaAuditLogAttributes / CreationAttributes`
2. 已将 `server/models/FormulaDefinition.js` 迁移为 `server/models/FormulaDefinition.ts`
3. 已将 `server/models/FormulaRevision.js` 迁移为 `server/models/FormulaRevision.ts`
4. 已将 `server/models/FormulaAuditLog.js` 迁移为 `server/models/FormulaAuditLog.ts`
5. 已将 `server/services/formulas/formula.repository.js` 迁移为 `server/services/formulas/formula.repository.ts`
6. 已执行 `npm run type-check:server`
7. 已执行 `node --require tsx/cjs --test --test-concurrency=1 tests/formula-workflow.test.js tests/formula-validator.test.js`
8. 上述定向测试全部通过（5/5）
9. 当前未改动 formulas 业务语义

## 4. 当前建议顺序

1. 先复用 `server/models/types.ts` 的思路，为 formulas 增加必要类型
2. 迁 `server/models/FormulaDefinition.js`
3. 迁 `server/models/FormulaRevision.js`
4. 迁 `server/models/FormulaAuditLog.js`
5. 迁 `server/services/formulas/formula.repository.js`

当前结果：

1. 第 1 步已完成
2. 第 2 步已完成
3. 第 3 步已完成
4. 第 4 步已完成
5. 第 5 步已完成
6. 第二批计划范围已完成

## 5. 当前约束

本批默认不做：

1. 不调整 formulas 业务语义
2. 不顺手重写 workflow
3. 不顺手调整前端配方流程
4. 不修改数据库 schema
5. 不修改 migration

## 6. 当前验证要求

本批最小验证至少包括：

1. `tests/formula-workflow.test.js`
2. `tests/formula-validator.test.js`
3. `npm run type-check:server`

必要时再补：

1. `npm test`

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

1. 执行第二批定向验证
2. 评估是否收口提交第二批

开始，确认 formulas 模型层与 repository 层迁移后的链路稳定性。
