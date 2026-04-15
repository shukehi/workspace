# 后端 TypeScript 第三批迁移进度（2026-03-13）

> 状态：阶段计划，部分已落地。
> 对应任务：`docs/archive/backend-ts/BACKEND_TYPESCRIPT_MIGRATION_TASKS_2026-03-13.md` 中“第三批：mapping / materials catalog 模型与 repository”。

## 1. 目标范围

本批目标是固定 mapping / materials catalog 这两类 revision/profile 型工作流的后端类型边界。

计划范围：

1. `server/models/MappingProfile.ts`
2. `server/models/MappingRevision.ts`
3. `server/models/MappingAuditLog.ts`
4. `server/models/MappingUnmatchedEvent.ts`
5. `server/models/MaterialCatalogProfile.ts`
6. `server/models/MaterialCatalogRevision.ts`
7. `server/models/MaterialCatalogAuditLog.ts`
8. `server/services/mappings/mapping.repository.ts`
9. `server/services/materials/materialCatalog.repository.ts`

## 2. 当前进度

当前状态：

1. 第一批（订单 / 库存 / 物料）已完成并提交
2. 第二批（formulas）已完成并提交
3. 已完成第三批第一步类型预备：在 `server/models/types.ts` 中补 mapping / materials catalog 类型
4. 已完成第三批模型迁移：
   - `server/models/MappingProfile.ts`
   - `server/models/MappingRevision.ts`
   - `server/models/MappingAuditLog.ts`
   - `server/models/MappingUnmatchedEvent.ts`
   - `server/models/MaterialCatalogProfile.ts`
   - `server/models/MaterialCatalogRevision.ts`
   - `server/models/MaterialCatalogAuditLog.ts`
5. 已完成第三批 repository 迁移：
   - `server/services/mappings/mapping.repository.ts`
   - `server/services/materials/materialCatalog.repository.ts`
6. 已执行 `npm run type-check:server`
7. 已确认运行时通过 `tsx` 加载第三批模型与 repository
8. 已执行第三批定向测试：
   - `tests/mapping-repository.test.js`
   - `tests/mapping-workflow.test.js`
   - `tests/materials-workflow.test.js`
   - `tests/config-routes.test.js`
9. 上述定向测试全部通过（13/13）

## 3. 已完成项

已完成：

1. 已在 `server/models/types.ts` 中补充 mapping / materials catalog 相关 `Attributes / CreationAttributes`
2. 已将 7 个第三批模型文件迁移为 TypeScript
3. 已将 2 个第三批 repository 文件迁移为 TypeScript
4. 已删除对应旧 `.js` 文件，确保运行时不再优先加载旧实现
5. 当前未改动 mapping / materials catalog 的 workflow 语义

## 4. 当前建议顺序

1. 先补 `server/models/types.ts`
2. 迁 mapping 相关模型
3. 迁 materials catalog 相关模型
4. 迁 `server/services/mappings/mapping.repository.ts`
5. 迁 `server/services/materials/materialCatalog.repository.ts`
6. 执行第三批定向验证

## 5. 当前约束

本批默认不做：

1. 不修改 published/draft workflow 语义
2. 不修改 mapping 规则本身
3. 不顺手重构 route 层
4. 不修改数据库 schema
5. 不修改 migration

## 6. 当前验证要求

本批最小验证至少包括：

1. `tests/mapping-repository.test.js`
2. `tests/mapping-workflow.test.js`
3. `tests/materials-workflow.test.js`
4. `tests/config-routes.test.js`
5. `npm run type-check:server`

当前结果：

1. 第三批计划范围的模型与 repository 已完成迁移
2. `npm run type-check:server` 已通过
3. 第三批定向测试已通过（13/13）
