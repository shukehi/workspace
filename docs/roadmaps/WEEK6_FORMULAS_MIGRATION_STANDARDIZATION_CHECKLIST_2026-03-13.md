# 第六周 Formulas 与 Migration 规范化清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md`
> 状态：in_progress
> 目标：在订单、inventory、mappings 的结构化模式逐步稳定后，优先收敛 `useFormulaManager.ts` 的前端工作流边界，并正式建立数据库 migration 规范，开始替代启动时补列策略。

## 1. 第六周范围

本周聚焦两个高关联主题：

1. formulas 域的 editor/workflow/schema 边界收敛
2. 数据库 migration 机制规范化与 `ensure*Columns()` 退场起步

本周目标：

1. 让 formulas 域与前几周的模块化模式保持一致。
2. 优先降低 `useFormulaManager.ts` 的综合职责密度。
3. 建立正式 migration 基线，避免 schema 演进继续堆在应用启动流程中。
4. 保持配方编辑、发布、回滚、历史记录等核心行为不变。

## 2. 第六周交付物

1. `useFormulaManager.ts` 的职责收敛方案与落地结果。
2. formulas 契约 / 入口收敛说明。
3. 一套 migration 目录、命名规则和执行约定。
4. 第一批从 `ensure*Columns()` 迁出的 migration 文件。
5. 针对 formulas 与 migration 的回归测试与文档。

## 3. 执行面板

```text
Week 6
- Owner: TBD
- Status: in_progress
- Start Date:
- Target Date:
- Exit Criteria:
  - `useFormulaManager.ts` 已明显缩小或回归编排层
  - formulas 域职责边界已收敛并形成明确分层
  - `server/db/migrations/` 基线已建立并有首批 migration
  - 全新库初始化、已有库升级、测试环境重建三条路径已验证
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
  - `useFormulaManager.ts` 的 BOM normalize、本地校验、server error 映射、local draft key 规则已下沉到 `src/features/formulas/model/formulaDraft.ts`
  - `useFormulaManager.ts` 的列表/分页加载已下沉到 `src/features/formulas/composables/useFormulaList.ts`
  - `useFormulaManager.ts` 的 detail/revision 远端读取已下沉到 `src/features/formulas/composables/useFormulaDetail.ts`
  - `useFormulaManager.ts` 的 local draft 生命周期已下沉到 `src/features/formulas/composables/useFormulaLocalDraft.ts`
  - `useFormulaManager.ts` 的 `beforeunload` dirty guard 已下沉到 `src/features/formulas/composables/useDirtyBeforeUnload.ts`
  - 已新增 `server/db/migrate.js` 与 `server/db/migrations/*.js`，建立 migration runner 和首批 additive migration
  - `server/models/index.js` 已从 `ensure*Columns()` 切到 `sequelize.sync() + runMigrations()`
  - 已补 `tests/formula-draft-model.test.ts`
  - 已补 `tests/formula-list-composable.test.ts`
  - 已补 `tests/formula-detail-composable.test.ts`
  - 已补 `tests/formula-local-draft-composable.test.ts` 与 `tests/formula-dirty-before-unload.test.ts`
  - 已补 `tests/db-migrations.test.js`，验证 legacy sqlite schema 升级路径
  - 已通过 `npm run type-check`、`tests/formula-draft-model.test.ts`、`tests/formula-list-composable.test.ts`、`tests/formula-detail-composable.test.ts`、`tests/formula-local-draft-composable.test.ts`、`tests/formula-dirty-before-unload.test.ts`、`tests/db-migrations.test.js`、`tests/config-routes.test.js`、`tests/formula-workflow.test.js`、`tests/formula-validator.test.js`
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. `useFormulaManager.ts` 不再长期承载列表、详情、local draft、dirty guard、动作流全部细节。
2. formulas editor / workflow / validator / repository 的边界能够明确描述。
3. migration 机制不是文档约定，而是已有可执行目录、命名规则和首批脚本。
4. `ensure*Columns()` 这类启动补丁如果暂未完全删除，必须标记过渡期与退场计划。
5. 至少记录一次从干净环境初始化数据库的验证结果。

## 5. 风险控制模板

```text
Risk:
- migration 基线可能破坏本地、测试或已有库初始化
- formulas 收敛与 schema 调整同周推进，可能扩大变更面

Mitigation:
- 先盘点 schema 来源，再建立最小 migration 基线
- 首批 migration 只做基线和必要修正，不混入大规模领域改表
- 分别验证全新库、升级路径、测试重建路径

Rollback:
- 回滚入口：恢复基线前初始化方式与旧 schema 补丁路径
- 回滚条件：迁移执行失败、测试环境无法重建、已有库升级异常
- 回滚后验证步骤：使用旧初始化方式重建环境并复测 formulas 关键流程
```

## 6. 重点关注对象

### 3.1 前端

1. `src/features/formulas/composables/useFormulaManager.ts`
2. `src/services/formulaApi.ts`
3. `src/views/ColorFormula.vue`
4. `src/features/formulas/components/*`
5. `src/types/formula.ts`

### 3.2 后端

1. `server/services/formulas/formula.workflow.js`
2. `server/routes/formulasConfig.js`
3. 相关 repository / validator / mapper 文件
4. `server/models/index.js`
5. `server/config/database` 或数据库初始化相关入口

### 3.3 测试

1. `tests/config-routes.test.js`
2. 任何 formulas 相关测试
3. 数据库初始化与回归测试

## 7. 推荐目标结构

### 4.1 Formulas 域建议结构

```text
src/features/formulas/
├── api/
├── components/
├── composables/
├── model/
├── schemas/
└── utils/

server/services/formulas/
├── formula.workflow.js
├── formula.repository.js
├── formula.validator.js
├── formula.mapper.js
├── formula.policy.js        # 如需要
└── index.js
```

### 4.2 Migration 建议结构

```text
server/db/
├── migrations/
│   ├── 20260313-001-<name>.js
│   ├── 20260313-002-<name>.js
│   └── ...
└── models/
```

说明：

1. 本周优先建立 migration 机制与首批迁移，不要求一次性迁完所有历史补列逻辑。
2. `server/models/index.js` 中的 `ensure*Columns()` 先做减法，不强行一步清零。

## 8. 任务拆解

### 任务 1：Formulas 域职责盘点

目标：明确 formulas 前后端当前的边界与耦合点。

建议处理文件：

1. `src/features/formulas/composables/useFormulaManager.ts`
2. `src/views/ColorFormula.vue`
3. `server/services/formulas/formula.workflow.js`
4. `server/routes/formulasConfig.js`

建议动作：

- [x] 识别 editor 状态职责
- [x] 识别本地草稿职责
- [x] 识别发布/归档/回滚职责
- [ ] 识别 server workflow / validator / repository 的边界

验收：

1. formulas 域有一张清晰的职责分层图。

### 任务 2：前端 FormulaManager 收敛

目标：降低 `useFormulaManager.ts` 的综合职责密度。

建议新增文件：

1. `src/features/formulas/composables/useFormulaList.ts`
2. `src/features/formulas/composables/useFormulaDetail.ts`
3. `src/features/formulas/composables/useFormulaDraft.ts`
4. `src/features/formulas/model/formulaNormalizer.ts`

建议迁移内容：

- [x] 列表加载与分页职责
- [x] 明细加载与 revision 状态职责
- [x] 本地草稿与 dirty 状态职责
- [x] BOM normalize 与本地校验辅助

验收：

1. `useFormulaManager.ts` 体积明显下降或成为编排层。
2. 前端配方编辑流程行为保持一致。

### 任务 3：Formulas API 与 schema 边界收敛

目标：让 formulas 的前端 API、类型、校验边界更清晰。

建议新增/调整文件：

1. `src/features/formulas/api/formulaApi.ts` 或对现有 `src/services/formulaApi.ts` 进行收敛
2. `src/features/formulas/schemas/*`
3. `src/types/formula.ts`

建议动作：

- [ ] 明确列表 DTO、详情 DTO、revision DTO
- [ ] 抽出表单本地校验 schema 或纯函数
- [ ] 减少 composable 对原始接口 shape 的直接依赖

验收：

1. 前端 formulas 调用层与页面状态层解耦更明显。

### 任务 4：后端 formulas workflow 收敛

目标：对 formula workflow 做结构性收敛，而不改变业务语义。

建议拆分方向：

1. `formula.workflow.js` 继续保留为应用编排入口
2. 将可拆出的辅助能力下沉到：
   - `formula.policy.js`（状态与发布规则，如适用）
   - `formula.validation.js`（组合校验，如适用）
   - `formula.key-generator.js`（如拆分收益明显）

建议动作：

- [ ] 识别 key 生成职责
- [ ] 识别 bom 校验与物料解析职责
- [ ] 识别 revision 状态控制职责
- [ ] 保留 workflow 为“编排入口”而不是“所有细节总和”

验收：

1. workflow 主要负责流程编排。
2. formulas 规则变更不再必须改一个超大文件。

### 任务 5：建立 migration 机制基线

目标：正式建立 schema 变更的标准入口。

建议新增文件/目录：

1. `server/db/migrations/`
2. `server/db/migrations/README.md` 或等价说明文件
3. migration runner 脚本（按当前项目习惯选择位置）

建议动作：

- [ ] 约定 migration 文件命名规则
- [ ] 约定 up/down 或等价执行方式
- [ ] 约定开发、测试、生产环境的执行入口
- [ ] 明确 migration 与 `sequelize.sync()` 的关系

验收：

1. 新增 schema 变更有正式落点。
2. 团队知道以后不应继续扩大 `ensure*Columns()`。

### 任务 6：梳理并分类现有 ensure 逻辑

目标：把 `server/models/index.js` 中的启动补丁分类，找出首批可迁移对象。

处理文件：

1. `server/models/index.js`

建议动作：

- [ ] 列出 `ensureOrderColumns`
- [ ] 列出 `ensureOrderItemColumns`
- [ ] 列出 `ensureMaterialColumns`
- [ ] 列出 `ensureInventoryReceiptColumns`
- [ ] 列出 `ensureOrderIdempotencyIndexes`
- [ ] 标记“已稳定可迁移”与“过渡期保留”项目

验收：

1. 有明确的迁移优先级，而不是笼统地说“以后再迁”。

### 任务 7：落首批 migration

目标：挑选一组低风险、稳定、已被业务依赖的列/索引迁入 migration。

建议优先项：

1. 稳定且无复杂数据回填依赖的新增列
2. 唯一索引或普通索引
3. 不影响历史兼容逻辑的 additive schema 变更

建议动作：

- [ ] 编写第一批 migration 文件
- [ ] 在测试环境验证可重复执行或幂等执行策略
- [ ] 缩减对应 `ensure*` 的覆盖范围

验收：

1. 至少一批结构变更已从启动流程迁出。
2. migration runner 可以在本地和测试环境使用。

### 任务 8：补 migration 与 formulas 回归测试

目标：保证“结构规范化”不影响现有功能与数据初始化。

建议新增/补充测试：

1. migration runner 相关测试或脚本验证
2. formulas workflow 关键路径测试
3. config routes 中 formulas 相关回归测试

关键回归点：

- [ ] create formula
- [ ] update draft
- [ ] publish
- [ ] rollback / archive
- [ ] materials code 解析与 BOM 校验
- [ ] migration 执行后服务正常启动

### 任务 9：文档同步

目标：把 formulas 和 migration 规范文档化，作为后续数据库与配置域治理的标准。

建议更新文件：

1. `README.md`
2. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
3. `docs/progress/` 下新增阶段总结（如需要）

建议记录：

- [ ] migration 使用方式
- [ ] formulas 域拆分后的目录职责
- [ ] `ensure*Columns()` 的退场计划

## 6. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1、任务 2、任务 3
2. 再做任务 4
3. 然后做任务 5、任务 6
4. 再做任务 7
5. 最后做任务 8、任务 9

## 7. 推荐 PR 切分

### PR 1：Formulas 前端收敛

建议范围：

1. `src/features/formulas/composables/*`
2. `src/features/formulas/model/*`
3. `src/services/formulaApi.ts` 或 formulas api 收敛文件
4. 前端相关测试

建议标题：

`refactor(formulas): split formula manager responsibilities`

### PR 2：Formulas workflow 后端收敛

建议范围：

1. `server/services/formulas/*`
2. `server/routes/formulasConfig.js`（如需极小调整）
3. 后端相关测试

建议标题：

`refactor(formulas): isolate workflow helpers and validation boundaries`

### PR 3：Migration 基线落地

建议范围：

1. `server/db/migrations/*`
2. migration runner
3. `server/models/index.js`
4. migration 说明文档

建议标题：

`chore(db): introduce migration baseline and reduce startup schema patches`

## 8. 第六周验收清单

- [ ] `npm test`
- [ ] formulas 相关测试通过
- [ ] config routes 测试通过
- [ ] migration 可在本地执行
- [ ] 首批 `ensure*Columns()` 逻辑已迁出或缩减
- [ ] formulas 前后端职责边界更清晰
- [ ] `git status --short` 仅包含预期改动

## 9. 第六周不做的事

第六周明确不做：

1. 不一次性把全部历史 schema 补丁迁完
2. 不同时重构 materials、source-analysis、procurement 全域
3. 不在本周推进后端 TypeScript 全量迁移
4. 不修改 formulas 的业务语义与发布流程规则

这样可以保证第六周聚焦在“formulas 域收敛 + migration 正式起步”这两个高价值主题上。

## 10. 第七周衔接建议

如果第六周完成顺利，第七周建议优先选择以下其一：

1. 推进 materials / source-analysis 域收敛
2. 扩大 migration 覆盖范围并清理更多启动时 schema patch
