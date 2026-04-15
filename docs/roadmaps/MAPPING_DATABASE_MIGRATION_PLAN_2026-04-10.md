# Mapping Database Migration Plan

日期：2026-04-10

> 状态：**阶段计划（大部分已完成）**。
> 当前以 [MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md](/Users/aries/Dve/workspace/docs/progress/MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md) 作为真实进度依据。
> 已完成要点：runtime published-only、startup fail-closed、legacy mapping route 去 JSON 化、workflow 兼容 helper 清理。

## 目标

将 5 类 mapping：

- `packaging`
- `cylinder`
- `lock`
- `lock_fork`
- `handle`

的运行时真源、编辑真源、发布真源统一收口到 SQLite workflow published 数据，逐步下线 `data/config/*.json` 兼容层。

当前判断：这不是从零迁移到数据库，而是把现有数据库 workflow 作为唯一真源，清理剩余 JSON fallback 和 legacy 路由。

## 当前现状

数据库 workflow 已存在：

- `mapping_profiles`
- `mapping_revisions`
- `mapping_audit_logs`

核心代码已具备：

- workflow：`server/services/mappings/mapping.workflow.ts`
- repository：`server/services/mappings/mapping.repository.ts`
- published/detail/draft/publish/audit-logs 路由：`server/routes/mappingsConfig.ts`
- 前端运行时读取入口：`src/services/configRepository.ts`
- 前端编辑入口：`src/services/mappingConfigApi.ts`

仍未彻底收口的点：

- 前端运行时仍保留 legacy API 和 `/data/*.json` fallback
- 后端 legacy 配置接口仍会读写 `data/config/*.json`
- workflow 中仍保留 `ensurePublishedMapping`、`seedFromLegacyPayload`、`syncLegacyRuntimeFile`

## 需要改动的层

### 1. 前端运行时读取层

文件：

- `src/services/configRepository.ts`
- `src/services/configLoader.ts`

目标：

- mapping 读取只保留 `/api/config/mappings/:type/published`
- 删除 legacy `/api/config/<type>` fallback
- 删除 `/data/*.json` fallback
- published 缺失时显式报错，不再静默降级

### 2. 前端编辑与发布层

文件：

- `src/services/mappingConfigApi.ts`
- `src/features/config-editor/composables/useMappingConfigEditor.ts`

目标：

- 保存始终走 `draft -> publish`
- UI 明确依赖 workflow revision 状态
- 不再依赖 legacy 保存语义

### 3. 后端 workflow 与 repository

文件：

- `server/services/mappings/mapping.workflow.ts`
- `server/services/mappings/mapping.repository.ts`

目标：

- 保留 workflow 作为唯一状态机
- 删除或废弃：
  - `seedFromLegacyPayload`
  - `ensurePublishedMapping`
  - `syncLegacyRuntimeFile`
- 改为：无 published revision 时返回配置缺失错误

### 4. 后端 legacy 配置接口

文件：

- `server/routes/configData.ts`

目标：

- 停止从 `data/config/*.json` 读取 mapping
- 停止把 published payload 回写到本地 JSON
- legacy 路由如果暂时保留，只做 workflow 兼容转发

### 5. 配置文件路径与文件制真源

文件：

- `server/config/paths.ts`
- `data/config/packaging-mapping.json`
- `data/config/cylinder-mapping.json`
- `data/config/lock-mapping.json`
- `data/config/lock-fork-mapping.json`
- `data/config/handle-mapping.json`

目标：

- 这些 JSON 文件不再承担运行时真源角色
- 过渡期可保留为导入基线
- 收口完成后，移除运行时代码对它们的依赖

## 推荐执行阶段

### 阶段 0：冻结边界

1. 明确运行时唯一读取口径：`/api/config/mappings/:type/published`
2. 明确编辑唯一保存口径：workflow `draft -> publish`
3. 标记 legacy 路由进入退役名单

完成标准：

- 团队对“mapping 真源是 published workflow”达成一致

### 阶段 1：做数据兜底

1. 检查 5 个 profile 是否都存在 published revision
2. 如果缺失，补一次性 seed/migration 脚本
3. 验证 DB published payload 与当前 JSON payload 等价
4. 产出核对表：
   - `profile_code`
   - `latest_revision`
   - `published_revision`
   - `payload_hash`

完成标准：

- 5 个 profile 在数据库里都有有效 published revision

### 阶段 2：运行时只读数据库

1. 修改 `src/services/configRepository.ts`
2. 删除 mapping 运行时 fallback
3. 保证 source analysis、采购生成、打印预览仍正常

完成标准：

- 运行时读取 mapping 不再依赖本地 JSON

### 阶段 3：停止 JSON 回写

1. 修改 `server/routes/configData.ts`
2. 停止 legacy 接口读写本地 JSON
3. 删除 workflow 里的 runtime file 同步逻辑

完成标准：

- mapping 保存动作不再写 `data/config/*.json`

### 阶段 4：下线 legacy API

候选接口：

- `/api/config/packaging`
- `/api/config/cylinder`
- `/api/config/lock`
- `/api/config/lock-fork`
- `/api/config/handle`
- `/api/config/packaging-mapping`

完成标准：

- mapping 只有 workflow API 对外提供服务

### 阶段 5：清理文档与文件真源

1. 更新 API 文档
2. 更新治理文档
3. 清理“JSON 是当前真源”的旧描述
4. 降级或删除运行时代码中的 `CONFIG_FILES.*Mapping`

完成标准：

- 文档与代码边界一致

## 测试与验证

至少覆盖以下链路：

1. `GET /api/config/mappings/:type/published`
2. `PUT /api/config/mappings/:type/draft`
3. `POST /api/config/mappings/:type/publish`
4. `POST /api/config/mappings/:type/rollback`
5. source analysis
6. PO generation
7. 打印预览
8. 配置页保存与发布

建议补的断言：

1. published 缺失时返回明确错误
2. 运行时不再触发 `/data/*.json` fallback
3. legacy 路由不再写本地 JSON
4. 相同合同样本在迁移前后提取结果一致

## 工作量评估

### 半步收口

范围：

- 运行时只读 DB
- 停止 JSON 回写
- legacy 路由先保留

预估：

- `0.5 - 1.5 天`

### 完整收口

范围：

- 半步收口全部内容
- 下线 legacy API
- 清理 JSON 真源语义
- 补齐测试和文档

预估：

- `2 - 4 天`

### 完整收口 + 环境与迁移工具完善

范围：

- 完整收口全部内容
- 增加 seed/migration 工具
- 增加环境校验脚本
- 增加发布前检查

预估：

- `4 - 6 天`

## 风险点

1. 最大风险不是代码，而是环境中 published 数据不完整
2. 一旦移除 fallback，缺失 profile 会直接导致：
   - source analysis 缺项
   - PO generation 缺项
   - 配置页读取失败
3. 现有测试中可能有不少默认依赖 legacy 路由或 JSON 文件

## 建议策略

推荐按“半步收口 -> 完整收口”推进：

1. 先确认数据库 published 数据完整
2. 再切前端运行时只读 DB
3. 然后停掉后端 JSON 回写
4. 最后下线 legacy API 和文件真源

## 完成标准

1. mapping 运行时读取不再依赖 `data/config/*.json`
2. mapping 保存不再写本地 JSON
3. 5 个 profile 在 DB 中都有有效 published revision
4. source analysis、PO generation、打印预览在真实合同样本上结果不变
5. API 文档、治理文档、代码行为三者一致
