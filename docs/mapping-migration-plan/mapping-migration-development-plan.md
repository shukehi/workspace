# 锁芯/锁叉/包装映射迁移开发计划

## 1. 文档目的

这份文档用于统一管理“锁芯 / 锁叉 / 包装映射从 JSON 迁移到 SQLite，并提供前端可管理能力”的开发任务。

使用方式：
- 作为开发总计划，按里程碑推进。
- 作为优化底稿，在执行过程中持续补充风险、决策和变更记录。
- 作为验收依据，确保迁移后运行口径一致且可回滚。

## 2. 目标与验收标准

### 2.1 目标
1. 三类映射（`packaging` / `cylinder` / `lock_fork`）以 SQLite 为唯一主数据源。
2. 前端支持列表、编辑草稿、发布、回滚、查看历史。
3. 采购生成、打印预览、物料分析三条链路统一读取 `published`。
4. 发布前有服务端校验，并支持字段级错误提示。
5. 保留迁移导入和回滚导出能力。

### 2.2 验收标准
1. 运行时代码不再直接读取 `public/data/*mapping*.json`。
2. `/api/config/mappings/:type/published` 成为唯一运行态映射来源。
3. 映射管理工作台可完成草稿保存、发布、回滚、历史查看。
4. 关键业务样本在迁移前后结果一致。
5. 全链路通过：
   - `npm run type-check`
   - `npm test`
   - `npm run build`

## 3. 当前现状总结

### 3.1 已有基础
1. 项目中已经存在一套配方管理工作流，可复用 revision / publish / rollback / audit 的设计。
2. SQLite 与 Sequelize 已在项目中使用。
3. 包装映射已有 API 入口，但锁芯和锁叉仍直接读取静态 JSON。

### 3.2 当前主要问题
1. 三类映射读取口径不统一。
2. 部分消费方直接依赖原始 JSON 结构，缺少统一 adapter。
3. 包装映射存在旧 API 与静态文件兼容路径，后续容易继续扩散。
4. 发布、回滚、历史、审计只在 formula 领域成熟，mapping 领域尚未建立。
5. 打印、采购、分析链路对映射版本的追溯策略尚未完全明确。

## 4. 迁移前必须先明确的关键决策

这些决策不应在开发中途模糊处理，否则后续容易返工。

### 4.1 版本与状态语义
1. 每个 profile 是否仅允许一个 draft。
2. publish 后旧 published 是否自动 archived。
3. `active_revision` 是否始终指向当前 published revision。
4. rollback 是否生成新 revision，还是直接切回历史 revision。

### 4.2 历史单据追溯策略
1. 历史采购单、打印预览是否按“当前 published”重算。
2. 若要求可追溯，订单快照或打印快照中是否记录 mapping revision。

### 4.3 前端编辑策略
1. 包装映射采用结构化表格编辑。
2. 锁芯与锁叉第一版采用 JSON 编辑器，还是直接做结构化编辑器。

### 4.4 发布前校验策略
1. 是否仅做 schema 校验。
2. 是否必须做 runtime preflight（adapter normalize + 样本 smoke test）。

## 5. 技术原则

1. 先统一运行时契约，再做数据迁移。
2. 先收口读取入口，再切换底层数据源。
3. 先建立回归基线，再执行正式迁移。
4. 优先复用 formula 工作流模式，不重复造轮子。
5. JSON 在迁移后只保留为导入导出用途，不再作为运行时真源。
6. 第一版优先保证正确性和可追溯性，不追求复杂交互。

## 6. 推荐文档维护方式

为了便于后续根据开发情况持续优化，建议按以下规则维护这份文档：

1. `任务` 只写可执行项，不写模糊目标。
2. `待确认决策` 单独维护，不与已确认方案混写。
3. `风险` 与 `应对` 成对记录。
4. 每个里程碑完成后，更新对应的“完成标准”和“实际偏差”。
5. 新发现的问题不要直接塞进正文，优先记录到“优化记录”。

建议后续按以下节奏更新：
- 开发前：补齐待确认决策。
- 每完成一个里程碑：更新状态与偏差。
- 每次方案调整：追加一条优化记录。

## 7. 总体执行顺序

1. 迁移前优化
2. 里程碑 A：后端底座
3. 里程碑 B：数据迁移
4. 里程碑 C：前端与运行链路收口
5. 里程碑 D：映射管理工作台
6. 里程碑 E：下线 JSON 运行依赖

---

## 8. 迁移前优化任务

目标：先统一口径、补校验、建基线，降低迁移风险。

### 8.1 运行时契约与 adapter
1. 冻结三类映射 DTO 与 `published` API 契约。
2. 前后端分别建立 `mappingAdapter`。
3. 统一 `published` API 输出结构。
4. 包装映射消除“对象字典 / `{ supplierName, mappings }`”双形态兼容。

### 8.2 读取入口收口
1. 收口全部映射读取入口到 `configLoader`。
2. 盘点所有直接读取 JSON 的调用点。
3. 业务模块只通过 loader / adapter 获取映射。

### 8.3 校验能力
1. 为包装、锁芯、锁叉分别建立 validator。
2. 错误格式统一为 `path + message + code`。
3. 发布前引入 preflight 校验。

### 8.4 基线与回归
1. 建立关键业务样本集。
2. 建迁移前后结果一致性对比测试。
3. 补 source guard，防止继续新增 JSON 直读路径。

### 8.5 关键文件
- `/Users/aries/Dve/workspace/src/services/configLoader.ts`
- `/Users/aries/Dve/workspace/src/services/poGenerator.ts`
- `/Users/aries/Dve/workspace/src/lib/packagingMatcher.ts`
- `/Users/aries/Dve/workspace/src/lib/erp-engine/packagingTable.ts`
- `/Users/aries/Dve/workspace/src/stores/useSourceStore.ts`

---

## 9. 里程碑 A：后端底座

目标：建立 mapping revision / publish / rollback / audit 能力。

### 9.1 数据模型
1. `mapping_profiles`
2. `mapping_revisions`
3. `mapping_audit_logs`
4. `mapping_unmatched_events`

### 9.2 后端任务
1. 新增 model：
   - `server/models/MappingProfile.js`
   - `server/models/MappingRevision.js`
   - `server/models/MappingAuditLog.js`
   - `server/models/MappingUnmatchedEvent.js`
2. 在 `server/models/index.js` 中注册关联与导出。
3. 新建 repository：`server/services/mappings/mapping.repository.js`
4. 新建 validator：
   - `server/services/mappings/mapping.validator.js`
   - `server/services/mappings/validators/packaging.validator.js`
   - `server/services/mappings/validators/cylinder.validator.js`
   - `server/services/mappings/validators/lockFork.validator.js`
5. 新建 mapper：`server/services/mappings/mapping.mapper.js`
6. 新建 workflow：`server/services/mappings/mapping.workflow.js`
7. 新建服务出口：`server/services/mappings/index.js`
8. 新建 API 路由：`server/routes/mappingsConfig.js`
9. 在服务入口挂载路由。

### 9.3 API 范围
1. `GET /api/config/mappings/:type`
2. `GET /api/config/mappings/:type/detail`
3. `PUT /api/config/mappings/:type/draft`
4. `POST /api/config/mappings/:type/publish`
5. `POST /api/config/mappings/:type/rollback`
6. `GET /api/config/mappings/:type/revisions`
7. `GET /api/config/mappings/:type/published`
8. `GET /api/config/mappings/:type/unmatched`

### 9.4 测试
1. `tests/mapping-workflow.test.js`
2. `tests/mapping-routes.test.js`
3. `tests/mapping-validator.test.js`

### 9.5 完成标准
1. 能自动建表。
2. detail / draft / publish / rollback / revisions / published API 可用。
3. 409 乐观锁冲突可返回 `latestRevision`。
4. workflow 与 routes 测试通过。

---

## 10. 里程碑 B：数据迁移

目标：将三份 JSON 初始化导入到 SQLite，形成 revision=1 的 published 数据。

### 10.1 迁移脚本
1. 新建 `server/scripts/migrate_mappings_to_sqlite.js`
2. 支持 `--dry-run`
3. 输出条目数、checksum、profile 状态
4. 默认拒绝覆盖已有 published 数据

### 10.2 回滚与导出脚本
1. 新建 `server/scripts/export_mappings_to_json.js`
2. 从当前 published 导出回 JSON
3. 为应急回滚预留脚本能力

### 10.3 package.json 脚本
1. `db:migrate:mappings`
2. `db:migrate:mappings:dry`
3. `db:export:mappings`

### 10.4 输入源
1. `public/data/packaging-mapping.json`
2. `public/data/cylinder-mapping.json`
3. `public/data/lock-fork-mapping.json`

### 10.5 测试
1. `tests/mapping-migration.test.js`
2. 验证 dry-run 输出
3. 验证导入后 revision 与 state
4. 验证 `/published` API 输出正确

### 10.6 完成标准
1. 三类 profile 成功导入。
2. 每类生成 `revision=1, state=published`。
3. `published` API 可返回正确 payload。
4. 导出脚本可正常工作。

---

## 11. 里程碑 C：前端与运行链路收口

目标：采购生成、打印预览、物料分析三处统一消费 `published`。

### 11.1 API 与类型
1. 新增 `src/types/mapping.ts`
2. 新增 `src/services/mappingApi.ts`
3. 前端统一消费 `/api/config/mappings/:type/published`

### 11.2 配置加载层
1. 改造 `src/services/configLoader.ts`
2. 删除三类映射运行时对静态 JSON 的直接读取
3. 增加 `refreshMappings()` 与版本元信息读取能力

### 11.3 包装链路
1. 改造 `src/lib/packagingMatcher.ts`
2. 改造 `src/lib/erp-engine/packagingTable.ts`
3. 改造包装名称解析与采购草稿生成逻辑

### 11.4 锁芯 / 锁叉链路
1. 改造 `extractCylinderData` 及相关逻辑
2. 改造 `extractLockForkData` 及相关逻辑
3. 统一使用 adapter 规范结构

### 11.5 采购 / 分析 / 打印
1. 改造 `src/services/poGenerator.ts`
2. 改造 `src/stores/useSourceStore.ts`
3. 盘点打印预览与快照创建时的映射来源
4. 明确打印结果是否需要固化 revision

### 11.6 测试
1. runtime regression tests
2. source guard tests
3. 采购结果一致性测试
4. 打印链路一致性测试

### 11.7 完成标准
1. 三类映射均从 `published` API 加载。
2. 运行时代码不再直接 fetch 静态 mapping JSON。
3. 采购、打印、分析三条链路口径一致。

---

## 12. 里程碑 D：映射管理工作台

目标：前端支持草稿编辑、发布、回滚、历史查看。

### 12.1 页面与路由
1. 新增页面：`src/views/MappingManagement.vue`
2. 新增导航入口
3. 新增路由：`/config/mappings`

### 12.2 前端状态与 API
1. 扩展 `src/services/mappingApi.ts`
2. 新建 `src/features/mappings/composables/useMappingManager.ts`
3. 新建错误解析工具与 path error map

### 12.3 公共组件
1. `MappingTabs.vue`
2. `MappingHeader.vue`
3. `MappingStatusBar.vue`
4. `MappingHistoryDialog.vue`
5. `MappingPublishDialog.vue`
6. `MappingRollbackDialog.vue`
7. `MappingRevisionDiff.vue`
8. `MappingUnmatchedPanel.vue`

### 12.4 编辑器策略
1. 包装映射：结构化表格编辑
2. 锁芯映射：JSON 编辑器
3. 锁叉映射：JSON 编辑器
4. 后续再评估是否升级为结构化编辑器

### 12.5 测试
1. 页面基础加载测试
2. composable 测试
3. 包装编辑器测试
4. JSON 编辑器测试
5. 错误回填测试

### 12.6 完成标准
1. 可查看 detail / revisions。
2. 可保存草稿。
3. 可发布、回滚。
4. 字段级错误可在前端展示。

---

## 13. 里程碑 E：切流与清理

目标：正式下线 JSON 运行依赖，保留导入导出工具链。

### 13.1 运行时代码清理
1. 删除 `configLoader` 中三类映射的静态 JSON fallback。
2. 删除或废弃旧包装映射接口 `/api/config/packaging-mapping`。
3. 清理运行时代码中所有旧 JSON 读取点。

### 13.2 运行健康与监控
1. 增加 mapping health API。
2. 完善 unmatched 事件采集与查询。
3. 完善发布 / 回滚审计可查询能力。

### 13.3 回滚准备
1. 确认导出脚本可用。
2. 编写 `docs/mapping-rollback-runbook.md`。
3. 演练一次导出与回退流程。

### 13.4 测试与验收
1. 更新 source guard，禁止运行时退回旧模式。
2. 增加“无 fallback”测试。
3. 全链路通过：
   - `npm run type-check`
   - `npm test`
   - `npm run build`

### 13.5 完成标准
1. `published` 成为唯一运行时来源。
2. 旧接口和旧 fallback 不再参与业务运行。
3. 有健康检查、导出脚本、回滚文档。

---

## 14. 总任务表

### 14.1 Epic 0：迁移前优化
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| E0-1 | 冻结三类映射 DTO 与 `published` API 契约 | P0 | 后端 + 前端 | 无 |
| E0-2 | 实现前后端 `mappingAdapter` | P0 | 前端 + 后端 | E0-1 |
| E0-3 | 收口全部映射读取入口到 `configLoader` | P0 | 前端 | E0-1 |
| E0-4 | 盘点并清理运行时直接读 JSON 的调用点 | P0 | 前端 + 后端 | E0-3 |
| E0-5 | 建立三类 validator | P0 | 后端 | E0-1 |
| E0-6 | 定义 path-based 错误结构 | P0 | 后端 + 前端 | E0-5 |
| E0-7 | 建关键样本回归集 | P0 | QA + 业务 + 前端 | 无 |
| E0-8 | 建迁移前后结果对比测试 | P0 | QA + 前端 | E0-7 |
| E0-9 | 明确历史单据是否按 revision 重现 | P0 | 产品/业务 | 无 |
| E0-10 | 明确 revision / draft / published / rollback 规则 | P0 | 后端 + 产品 | 无 |

### 14.2 Epic A：后端底座
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| A-1 | 新增 `MappingProfile` model | P0 | 后端 | E0-10 |
| A-2 | 新增 `MappingRevision` model | P0 | 后端 | E0-10 |
| A-3 | 新增 `MappingAuditLog` model | P0 | 后端 | E0-10 |
| A-4 | 新增 `MappingUnmatchedEvent` model | P1 | 后端 | 无 |
| A-5 | 在 `server/models/index.js` 注册关联 | P0 | 后端 | A-1,A-2,A-3 |
| A-6 | 新建 `mapping.repository.js` | P0 | 后端 | A-5 |
| A-7 | 新建 validator 与子校验器 | P0 | 后端 | E0-5 |
| A-8 | 新建 `mapping.mapper.js` | P0 | 后端 | E0-1 |
| A-9 | 新建 `mapping.workflow.js` | P0 | 后端 | A-6,A-7,A-8 |
| A-10 | 新建 `mappingsConfig.js` 路由 | P0 | 后端 | A-9 |
| A-11 | 挂载 mappings 路由 | P0 | 后端 | A-10 |
| A-12 | 增加 workflow/routes 测试 | P0 | 后端 + QA | A-10 |

### 14.3 Epic B：数据迁移
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| B-1 | 编写 `migrate_mappings_to_sqlite.js` | P0 | 后端 | A-9 |
| B-2 | 支持 `--dry-run` | P0 | 后端 | B-1 |
| B-3 | 计算条目数与 checksum | P0 | 后端 | B-1 |
| B-4 | 编写 `export_mappings_to_json.js` | P0 | 后端 | A-9 |
| B-5 | 在 `package.json` 注册 scripts | P0 | 后端 | B-1,B-4 |
| B-6 | 编写 migration tests | P0 | 后端 + QA | B-1 |
| B-7 | 跑 dry-run 并人工核对 | P0 | 后端 + 业务 | B-2,B-3 |
| B-8 | 正式导入 3 类 profile | P0 | 后端 | B-7 |
| B-9 | 验证 `/published` API 输出 | P0 | 后端 + 前端 | B-8 |

### 14.4 Epic C：前端与运行链路收口
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| C-1 | 新建 `src/services/mappingApi.ts` | P0 | 前端 | A-10 |
| C-2 | 改造 `configLoader` 三类映射读取 | P0 | 前端 | C-1,B-9 |
| C-3 | 增加 `refreshMappings()` 与版本元信息 | P1 | 前端 | C-2 |
| C-4 | 改造包装 matcher 只吃标准 DTO | P0 | 前端 | E0-2,C-2 |
| C-5 | 改造 packaging table / name resolver | P0 | 前端 | C-4 |
| C-6 | 改造 cylinder extractor | P0 | 前端 | C-2,E0-2 |
| C-7 | 改造 lock_fork extractor | P0 | 前端 | C-2,E0-2 |
| C-8 | 改造 `poGenerator` 统一来源 | P0 | 前端 | C-4,C-6,C-7 |
| C-9 | 收口打印预览数据来源 | P0 | 前端 + 后端 | C-8 |
| C-10 | 补运行时回归测试 | P0 | QA + 前端 | C-8,C-9 |
| C-11 | 增加 source guard | P0 | QA | C-2 |

### 14.5 Epic D：映射管理工作台
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| D-1 | 新增 `/config/mappings` 路由与导航 | P0 | 前端 | C-2 |
| D-2 | 扩展 `mappingApi` 支持 detail / publish / rollback | P0 | 前端 | A-10 |
| D-3 | 新建 `useMappingManager.ts` | P0 | 前端 | D-2 |
| D-4 | 新建 `MappingManagement.vue` 页面骨架 | P0 | 前端 | D-3 |
| D-5 | 新建公共 header / status / history / publish / rollback 组件 | P0 | 前端 | D-4 |
| D-6 | 包装映射结构化编辑器 | P0 | 前端 | D-4 |
| D-7 | 通用 JSON 编辑器 | P0 | 前端 | D-4 |
| D-8 | 锁芯编辑器接入 JSON editor | P0 | 前端 | D-7 |
| D-9 | 锁叉编辑器接入 JSON editor | P0 | 前端 | D-7 |
| D-10 | 字段级/path 错误回填 | P0 | 前端 | D-3,E0-6 |
| D-11 | unmatched 面板 | P1 | 前端 | A-4 |
| D-12 | 页面 / composable / editor 测试 | P0 | QA + 前端 | D-10 |

### 14.6 Epic E：切流与清理
| ID | 任务 | 优先级 | 角色 | 依赖 |
|---|---|---:|---|---|
| E-1 | 删除 `configLoader` 静态 JSON fallback | P0 | 前端 | C-10 |
| E-2 | 废弃 `/api/config/packaging-mapping` | P0 | 后端 | C-2 |
| E-3 | 清理旧 JSON 运行读取点 | P0 | 前端 + 后端 | E-1,E-2 |
| E-4 | 新增 mappings health API | P1 | 后端 | A-10 |
| E-5 | 完善 unmatched 事件采集 / 查询 | P1 | 后端 + 前端 | A-4,D-11 |
| E-6 | 更新 source guard，防止回退 | P0 | QA | E-3 |
| E-7 | 编写 rollback runbook | P0 | 后端 + 运维 | B-4 |
| E-8 | 最终全链路验收 | P0 | 全员 | E-1~E-7 |

---

## 15. 关键风险与控制

| 风险 | 说明 | 控制措施 |
|---|---|---|
| 运行时结构不一致 | 消费方对 payload 结构假设不同 | 先做 `mappingAdapter`，冻结 DTO |
| 发布后规则误配 | 影响采购或打印结果 | 发布前校验 + 回滚 + 审计 |
| 打印结果漂移 | 历史重打可能读取最新规则 | 明确 revision 追溯策略，必要时固化快照 |
| 迁移脚本重复执行 | 重复导入导致数据污染 | 默认拒绝覆盖，支持 dry-run |
| JSON 旧路径残留 | 迁移后仍存在双口径 | source guard + 全仓库清理 |
| 锁叉规则过于复杂 | 第一版前端编辑成本过高 | 第一版使用 JSON editor |

---

## 16. 建议排期方式

### 16.1 推荐批次
1. 批次 1：迁移前优化
2. 批次 2：里程碑 A
3. 批次 3：里程碑 B
4. 批次 4：里程碑 C
5. 批次 5：里程碑 D
6. 批次 6：里程碑 E

### 16.2 推荐上线前 Gate
1. 三类映射均已有 published revision。
2. 关键业务样本迁移前后结果一致。
3. 打印、采购、物料分析三条链路口径一致。
4. 管理台可完成保存草稿、发布、回滚。
5. 以下命令全部通过：
   - `npm run type-check`
   - `npm test`
   - `npm run build`

---

## 17. 待确认事项

1. 历史单据是否必须按旧 revision 重现。
2. rollback 是否生成新 revision。
3. `mapping_profiles` 是否只支持固定 3 个 profile，还是未来允许扩展。
4. 锁芯 / 锁叉第一版是否接受仅 JSON 编辑器。
5. unmatched 事件是否需要自动上报，还是仅管理台查看。

---

## 18. 优化记录

后续执行中如需调整方案，建议按以下模板追加，不要直接覆盖原结论。

### 记录模板
- 日期：
- 里程碑：
- 变更项：
- 原方案：
- 新方案：
- 变更原因：
- 影响范围：
- 是否影响排期：

