# 第七周 Materials / Source Analysis 域收敛清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md`
> 状态：todo
> 目标：在订单、inventory、mappings、formulas 的结构化模式逐步稳定后，继续收敛 materials 与 source-analysis 域，优先拆解 `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 链路，降低来源解析、物料目录、配置读取与业务规则之间的耦合度。

## 1. 第七周范围

本周聚焦两个相关领域：

1. materials / material catalog
2. source-analysis / source config / BOM 计算链路

本周目标：

1. 明确材料目录、库存物料、来源分析配置三者边界。
2. 收敛 source-analysis runtime、config loader 与 store 的职责边界。
3. 收敛前端 materials / source-analysis 页面与状态职责。
4. 收敛后端 materials / config 读取与 workflow 边界。
5. 为后续采购规则、BOM 计算和来源解析扩展建立更稳定的模块边界。

## 2. 第七周交付物

1. materials / source-analysis 域职责映射说明。
2. `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 链路收敛结果。
3. 前端相关页面与 store/composable 收敛结果。
4. 后端 materials / config / source-analysis 相关服务边界调整结果。
5. 面向来源解析与材料目录的回归测试补强。

## 3. 执行面板

```text
Week 7
- Owner: TBD
- Status: pending
- Start Date:
- Target Date:
- Exit Criteria:
  - materials / material catalog / source-analysis 三者边界已澄清
  - `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 链路已被明确切层
  - 前端与后端至少各完成一轮边界收敛
  - config runtime / repository / loader 职责已重新划分
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. `materials`、`material catalog`、`source-analysis` 不再在文档和代码中混用语义。
2. `useSourceStore` 不再直接承担过深的配置装载职责。
3. 页面层或 store 不再直接穿透调用过深的 config/runtime 细节。
4. `erp-engine` 相关逻辑至少完成入口整理和职责分层。
5. 至少记录一份来源解析或材料目录主链路回归结果。

## 5. 重点关注对象

### 3.1 前端

1. `src/views/Materials.vue`
2. `src/views/MaterialManagement.vue`
3. `src/views/Source.vue`
4. `src/stores/useSourceStore.ts`
5. `src/services/sourceAnalysis.ts`
6. `src/services/sourceAnalysisConfig.ts`
7. `src/services/configRuntime.ts`
8. `src/services/configRepository.ts`
9. `src/services/configLoader.ts`
10. `src/lib/erp-engine/*`

### 3.2 后端

1. `server/routes/material.js`
2. `server/routes/materialsConfig.js`
3. `server/routes/configData.js`
4. materials / material catalog 相关 service / workflow / repository

### 3.3 测试

1. `tests/config-routes.test.js`
2. `tests/handle-extraction.test.ts`
3. `tests/lock-fork-extraction.test.ts`
4. 其他 source-analysis / material 相关测试

## 6. 推荐目标结构

### 4.1 前端建议结构

```text
src/features/materials/
├── api/
├── components/
├── composables/
├── model/
└── pages/

src/features/source-analysis/
├── api/
├── composables/
├── model/
├── rules/
├── services/
└── pages/
```

### 4.2 后端建议结构

```text
server/services/materials/
├── material.service.js
├── material.repository.js
├── material.mapper.js
└── material.policy.js        # 如需要

server/services/material-catalog/
├── material-catalog.workflow.js
├── material-catalog.repository.js
├── material-catalog.mapper.js
└── material-catalog.validator.js
```

说明：

1. 本周重点是边界收敛，不要求一次性把来源分析引擎全部重写。
2. `erp-engine` 相关逻辑优先做“职责分层”和“入口整理”，避免继续直接散落在页面或 store 调用链中。

## 7. 核心边界原则

1. `materials` 表与 material catalog 工作流不是同一个概念，边界必须清晰。
2. `source-analysis` 负责来源解析与 BOM 计算，不应直接承担配置存储职责。
3. 配置加载、配置读取、运行时缓存、领域规则计算应分开。
4. 页面层不直接调用过深的 config/runtime 细节。

## 8. 任务拆解

### 任务 1：梳理材料与来源分析边界

目标：先澄清几个容易混淆的概念边界。

建议梳理主题：

1. `materials` 库存物料数据
2. `material catalog` 工作流配置数据
3. `source-analysis config` 解析规则数据
4. `erp-engine` 纯计算逻辑

建议处理文件：

1. `README.md`
2. `src/services/sourceAnalysis.ts`
3. `src/services/sourceAnalysisConfig.ts`
4. `src/services/configRuntime.ts`
5. `server/routes/material.js`
6. `server/routes/materialsConfig.js`

验收：

1. 领域边界有明确书面说明。
2. 后续重构不再混淆“库存物料”和“材料目录配置”。

### 任务 2：前端 Materials 页面收敛

目标：让材料相关页面回归页面装配层。

建议新增文件：

1. `src/features/materials/composables/useMaterialsPageState.ts`
2. `src/features/materials/composables/useMaterialCatalogPageState.ts`
3. `src/features/materials/model/materialNormalizer.ts`

建议迁移来源：

1. `src/views/Materials.vue`
2. `src/views/MaterialManagement.vue`

建议迁移内容：

- [ ] 列表加载与搜索
- [ ] 表单弹窗/编辑状态
- [ ] payload normalize
- [ ] material catalog 与 materials 表数据的页面交互边界

验收：

1. 页面文件体积缩小。
2. 页面职责更清晰。

### 任务 3：前端 Source 页面与 Store 收敛

目标：将 `Source.vue` 与 `useSourceStore.ts` 的职责进一步分层。

建议新增文件：

1. `src/features/source-analysis/composables/useSourcePageState.ts`
2. `src/features/source-analysis/composables/useSourceAnalysisFlow.ts`
3. `src/features/source-analysis/model/sourceNormalizer.ts`
4. `src/features/source-analysis/services/sourceAnalysisRuntime.ts`

建议迁移内容：

- [ ] 查询参数、表单输入、分析触发编排
- [ ] 分析结果 normalize
- [ ] 配置依赖装载逻辑
- [ ] 页面交互与 store 协调逻辑

验收：

1. 来源分析主流程更容易读懂。
2. 页面与 store 不再直接绑定太多底层细节。

### 任务 4：收敛 config runtime / repository / loader 边界

目标：把配置加载链路分层，避免多个文件各自承担部分职责。

重点文件：

1. `src/services/configRuntime.ts`
2. `src/services/configRepository.ts`
3. `src/services/configLoader.ts`

建议动作：

- [ ] 明确 runtime 负责缓存与初始化
- [ ] 明确 repository 负责读取与持久化接口
- [ ] 明确 loader 负责原始数据装载与转换
- [ ] 清理职责交叉或重复封装

验收：

1. 配置加载路径清晰。
2. 新增配置类型时有固定接入点。

### 任务 5：收敛 source-analysis 服务边界

目标：让来源解析、规则匹配、BOM 计算、配置依赖有清晰分工。

重点文件：

1. `src/services/sourceAnalysis.ts`
2. `src/services/sourceAnalysisConfig.ts`
3. `src/lib/erp-engine/dataExtractors.ts`
4. `src/lib/erp-engine/dataNormalizer.ts`
5. `src/lib/erp-engine/materialDecomposer.ts`
6. `src/lib/erp-engine/parsers.ts`

建议动作：

- [ ] 区分解析输入、规则决策、结果映射、输出格式化
- [ ] 将纯计算逻辑尽量留在 engine/rules 层
- [ ] 将配置访问从纯计算逻辑中解耦

验收：

1. 来源分析逻辑可以按“输入 -> 规则 -> 输出”理解。
2. 配置读写和业务计算不再纠缠过深。

### 任务 6：后端 materials / material-catalog 收敛

目标：让库存物料 CRUD 与材料目录 workflow 分层更清晰。

建议拆分方向：

1. `material.service / repository / mapper`
2. `material-catalog.workflow / repository / validator / mapper`

建议动作：

- [ ] 检查 `server/routes/material.js` 与 `server/routes/materialsConfig.js` 的职责边界
- [ ] 避免在 route 层混入过多工作流细节
- [ ] 对 material catalog 保持 workflow 风格一致性

验收：

1. 库存物料与材料目录接口边界更稳定。
2. 与 README 中的语义说明保持一致。

### 任务 7：对齐文档与 API 语义

目标：把当前已经容易混淆的 materials / config 语义重新文档化。

建议更新文件：

1. `README.md`
2. `docs/reference/api.md`
3. 必要的 domain 说明文档

建议内容：

- [ ] `GET /api/materials` 与 `GET /api/config/materials` 的职责区分
- [ ] 来源分析依赖哪些配置数据
- [ ] 哪些配置仅服务工作流，哪些会进入库存/入库链路

验收：

1. 新成员可以快速理解 materials 与 material catalog 的不同。

### 任务 8：补测试与回归保护

目标：确保来源分析与材料相关重构不改变业务结果。

重点测试文件：

1. `tests/config-routes.test.js`
2. `tests/handle-extraction.test.ts`
3. `tests/lock-fork-extraction.test.ts`
4. 任何 material / source-analysis 相关测试

建议新增测试：

1. `tests/source-analysis-runtime.test.ts`（如抽出 runtime 层）
2. `tests/material-normalizer.test.ts`（如抽出纯函数）

关键回归点：

- [ ] 来源分析输出保持一致
- [ ] handle / lock-fork 等提取规则结果保持一致
- [ ] material catalog workflow 不回归
- [ ] materials CRUD 与入库链路兼容

### 任务 9：文档同步

目标：将本周域边界收敛结果纳入整体治理文档。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. `docs/progress/` 下新增阶段总结（如需要）

建议记录：

- [ ] materials / material-catalog / source-analysis 最终边界
- [ ] config runtime/repository/loader 的职责说明
- [ ] 本周新增目录与文件落点

## 7. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1
2. 再做任务 2、任务 3
3. 然后做任务 4、任务 5、任务 6
4. 最后做任务 7、任务 8、任务 9

## 8. 推荐 PR 切分

### PR 1：Materials 前端收敛

建议范围：

1. `src/views/Materials.vue`
2. `src/views/MaterialManagement.vue`
3. `src/features/materials/*`
4. 相关测试

建议标题：

`refactor(materials): extract page state and material helpers`

### PR 2：Source-analysis 前端与配置加载边界收敛

建议范围：

1. `src/views/Source.vue`
2. `src/stores/useSourceStore.ts`
3. `src/services/sourceAnalysis*.ts`
4. `src/services/config*.ts`
5. `src/features/source-analysis/*`

建议标题：

`refactor(source): clarify analysis flow and config loading boundaries`

### PR 3：后端 materials / material-catalog 边界收敛

建议范围：

1. `server/routes/material.js`
2. `server/routes/materialsConfig.js`
3. 相关 services/workflow/repository
4. 回归测试

建议标题：

`refactor(materials): separate inventory materials from catalog workflow concerns`

## 9. 第七周验收清单

- [ ] `npm test`
- [ ] source-analysis 相关测试通过
- [ ] material / config routes 相关测试通过
- [ ] 来源分析结果无回归
- [ ] materials 与 material catalog 语义边界更清晰
- [ ] config runtime / repository / loader 职责更明确
- [ ] `git status --short` 仅包含预期改动

## 10. 第七周不做的事

第七周明确不做：

1. 不重写整个 `erp-engine`
2. 不同时大改 procurement / inventory 主流程
3. 不在本周推进后端 TypeScript 全量迁移
4. 不修改 source-analysis 的业务规则语义

这样可以保证第七周聚焦于“边界澄清 + 页面/配置/服务收敛”，而不是把来源分析演变成一次高风险重写。

## 11. 第八周衔接建议

如果第七周完成顺利，第八周建议优先选择以下其一：

1. 汇总前七周结果，形成统一执行索引与工程规范更新
2. 推进后端渐进式 TypeScript 迁移试点（先从 contracts/controllers 开始）
