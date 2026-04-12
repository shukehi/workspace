# Mapping Database File Execution Plan

日期：2026-04-10

> 状态：**文件级实施计划（大部分已执行）**。
> 当前以 [MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md](/Users/aries/Dve/workspace/docs/progress/MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md) 记录实际落地结果。
> 已落地的主线文件包括：`configRepository.ts`、`configLoader.ts`、`configData.ts`、`mapping.workflow.ts` 及相关测试。

## 目标

将 mapping 系统按文件拆解为可执行实施计划，目标是让以下 5 类配置完全以 SQLite published workflow 为唯一真源：

- `packaging`
- `cylinder`
- `lock`
- `lock_fork`
- `handle`

## 执行顺序

推荐按以下顺序推进：

1. 数据兜底与校验
2. 前端运行时读取收口
3. 后端 legacy 路由去 JSON 化
4. workflow 清理兼容逻辑
5. 文档与测试收尾

---

## 阶段 1：数据兜底与校验

### 文件：`server/services/mappings/mapping.repository.ts`

任务：

1. 增加便于发布前校验的查询能力：
   - 按 profile 列出 latest revision
   - 按 profile 列出 published revision
   - 批量读取 published payload hash 或 revision 信息
2. 如现有查询已够用，仅补内部 helper，避免把校验逻辑散落在 route/service 层

产出：

- 可被 migration 脚本或检查脚本复用的 repository 接口

### 文件：`server/services/mappings/mapping.workflow.ts`

任务：

1. 增加“校验 published 是否存在”的明确入口
2. 将“缺少 published”区分成可识别错误，而不是模糊返回 `null`
3. 为后续移除 `ensurePublishedMapping` 做铺垫

产出：

- 统一的 published 存在性判断入口

### 新文件：`server/scripts/seed_mapping_profiles.ts`

任务：

1. 从当前 `data/config/*.json` 导入 5 个 profile
2. 若 profile 不存在则创建
3. 若 published 不存在则创建 `revision=1, state=published`
4. 默认拒绝覆盖已有 published 数据

产出：

- 一次性 seed 脚本

### 新文件：`server/scripts/check_mapping_published_state.ts`

任务：

1. 输出 5 个 profile 的 published 状态
2. 输出 latest/published revision
3. 输出 payload 基本信息，供上线前核查

产出：

- 发布前检查脚本

---

## 阶段 2：前端运行时读取收口

### 文件：`src/services/configRepository.ts`

任务：

1. 删除 mapping 的 legacy API fallback：
   - `/api/config/packaging`
   - `/api/config/cylinder`
   - `/api/config/lock`
   - `/api/config/lock-fork`
   - `/api/config/handle`
2. 删除 mapping 的 `/data/*.json` fallback：
   - `/data/packaging-mapping.json`
   - `/data/cylinder-mapping.json`
   - `/data/lock-mapping.json`
   - `/data/lock-fork-mapping.json`
   - `/data/handle-mapping.json`
3. `readMapping(kind)` 只保留：
   - `/api/config/mappings/:type/published`
4. mapping published 缺失时显式抛错

产出：

- mapping 运行时读取单一化

风险：

- 任何 profile 没有 published revision，运行时会直接失败

### 文件：`src/services/configLoader.ts`

任务：

1. 确认 `loadMapping()` 的失败行为适配新仓库契约
2. 去掉对“空 payload 继续容错”的过度宽松处理
3. 明确日志：是哪一类 mapping 缺 published

产出：

- 前端配置加载失败原因更明确

### 文件：`src/services/sourceAnalysis.ts`

任务：

1. 无需大改业务逻辑
2. 验证 source analysis 不依赖 JSON fallback
3. 如有必要，补 error context，方便知道是哪个 mapping 缺失

产出：

- source analysis 对 DB published 的显式依赖

### 文件：`src/services/poGenerator.ts`

任务：

1. 无需改生成算法
2. 校验生成流程在 DB-only 环境下仍能跑通
3. 若日志依赖 fallback 语义，进行清理

产出：

- PO 生成链路确认不依赖 JSON

---

## 阶段 3：后端 legacy 路由去 JSON 化

### 文件：`server/routes/configData.ts`

任务：

1. 删除 `readLegacyMappingRuntime(...)`
2. 删除 `ensureJsonFile(...)` 对 mapping 文件的依赖
3. 删除 legacy mapping GET 路由中的：
   - 读取 `data/config/*.json`
   - `ensurePublishedMapping(...)`
   - `syncLegacyRuntimeFile(...)`
4. 删除 legacy mapping PUT 路由中的：
   - JSON 兼容适配读文件逻辑
   - `syncLegacyRuntimeFile(...)`
5. 保留接口路径时，内部仅转发到 workflow：
   - 读取时读 detail/published
   - 保存时走 draft/publish

产出：

- 即使 legacy URL 还在，也不再读写本地 JSON

风险：

- 某些旧页面如果仍依赖这些路由的特殊返回形状，需要额外兼容

### 文件：`server/routes/mappingsConfig.ts`

任务：

1. 作为正式唯一 workflow API，补齐错误信息一致性
2. 明确 published 缺失时的返回格式
3. 如有必要，补一个轻量 summary 接口供健康检查使用

产出：

- mapping workflow API 作为唯一正式入口更稳定

### 文件：`server/config/paths.ts`

任务：

1. 降级 `packagingMapping / cylinderMapping / lockMapping / lockForkMapping / handleMapping` 的运行时语义
2. 若 legacy 彻底下线，可移除这些路径常量
3. 若还需 migration 使用，可标注为“seed source only”

产出：

- 路径配置不再误导为运行时真源

---

## 阶段 4：workflow 兼容逻辑清理

### 文件：`server/services/mappings/mapping.workflow.ts`

任务：

1. 删除或废弃：
   - `seedFromLegacyPayload`
   - `ensurePublishedMapping`
   - `syncLegacyRuntimeFile`
2. `getPublishedMapping()` 在没有 published 时返回明确错误
3. 保留 rollback/draft/publish 主状态机不变

产出：

- workflow 不再隐式依赖本地 JSON

风险：

- 任何调用方如果还指望自动 seed，会暴露出真实配置缺口

### 文件：`server/services/mappings/index.ts`

任务：

1. 清理已废弃的兼容导出
2. 保证外部只拿到正式 workflow API

产出：

- service 出口收口

---

## 阶段 5：前端配置编辑页收口

### 文件：`src/services/mappingConfigApi.ts`

任务：

1. 确认所有编辑页都通过 workflow 读写
2. 明确 `loadWorkflow` / `saveWorkflow` 是唯一正式入口
3. 如有旧 `load` / `save` 直连 legacy endpoint 的调用，迁移掉

产出：

- 编辑页与运行时一致地依赖 DB workflow

### 文件：`src/features/config-editor/composables/useMappingConfigEditor.ts`

任务：

1. 确认页面只依赖 workflow revision 状态
2. 删除与 legacy 成功返回结构耦合的逻辑
3. published / draft / latest revision 状态显示统一

产出：

- 配置页状态模型统一

### 文件：各配置页面

涉及页面：

- `src/views/CylinderConfig.vue`
- `src/views/LockConfig.vue`
- `src/views/LockForkConfig.vue`
- `src/views/HandleConfig.vue`
- 包装配置对应页面

任务：

1. 确认不再直接依赖 legacy 保存接口
2. 验证页面刷新后读取 published/draft 行为一致
3. 验证发布后运行时立即读到最新数据

产出：

- 配置页面完成 DB-only 收口

---

## 阶段 6：测试收口

### 文件：`tests/mapping-routes.test.ts`

任务：

1. 断言 published/detail/draft/publish/audit-logs 正常
2. 断言 published 缺失时报错明确

### 文件：`tests/config-routes.test.ts`

任务：

1. 删除对 JSON fallback 的默认假设
2. 若 legacy 路由保留，改为断言它只是 workflow 兼容壳

### 文件：`tests/source-analysis-runtime.test.ts`

任务：

1. 验证 source analysis 在 DB-only 下结果不变
2. 覆盖锁具/锁芯/护罩等依赖 mapping 的关键路径

### 文件：`tests/po-generator-integration.test.ts`

任务：

1. 验证 PO 生成在 DB-only 下结果不变
2. 验证 supplier/category 分组不受影响

### 文件：`tests/materials-workflow.test.ts`

任务：

1. 不一定直接改 mapping
2. 但需确认 materials workflow 与 mapping workflow 的边界仍清楚

### 文件：`tests/order-routes.test.ts`

任务：

1. 覆盖 auto-order 生成时对 published mapping 的依赖
2. 确认取消 JSON fallback 后订单生成无行为回归

### 文件：`tests/inventory-route.test.ts`

任务：

1. 若库存路径依赖采购生成出的 mapping 结果，做回归确认

---

## 阶段 7：文档收尾

### 文件：`docs/reference/api.md`

任务：

1. 标记 mapping workflow API 为唯一正式真源
2. 标记 legacy `/api/config/*` mapping 接口为兼容或废弃
3. 删除“运行时可回退到 JSON”的描述

### 文件：`docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`

任务：

1. 更新完成状态
2. 明确 mapping 已收口到 DB workflow

### 文件：`docs/reference/CYLINDER_RULES.md`

### 文件：`docs/reference/LOCK_RULES.md`

### 文件：`docs/reference/LOCK_FORK_RULES.md`

任务：

1. 把“当前配置文件路径”改成“workflow published 真源”
2. JSON 文件路径只保留为迁移历史说明

---

## 分阶段工作量

### P1：最小可运行收口

文件：

- `server/scripts/seed_mapping_profiles.ts`
- `server/scripts/check_mapping_published_state.ts`
- `src/services/configRepository.ts`
- `src/services/configLoader.ts`
- `tests/source-analysis-runtime.test.ts`
- `tests/po-generator-integration.test.ts`

预估：

- `0.5 - 1.5 天`

### P2：后端兼容层清理

文件：

- `server/routes/configData.ts`
- `server/services/mappings/mapping.workflow.ts`
- `server/config/paths.ts`
- `tests/config-routes.test.ts`
- `tests/mapping-routes.test.ts`

预估：

- `1 - 2 天`

### P3：完整下线与文档收尾

文件：

- 各配置页
- `src/services/mappingConfigApi.ts`
- `src/features/config-editor/composables/useMappingConfigEditor.ts`
- 文档文件

预估：

- `1 - 2 天`

总预估：

- 半步收口：`0.5 - 1.5 天`
- 完整收口：`2 - 4 天`

---

## 建议优先级

### 第一优先级

- `src/services/configRepository.ts`
- `server/scripts/check_mapping_published_state.ts`
- `server/scripts/seed_mapping_profiles.ts`

### 第二优先级

- `server/routes/configData.ts`
- `server/services/mappings/mapping.workflow.ts`
- `tests/mapping-routes.test.ts`

### 第三优先级

- 各配置页
- 文档

---

## 完成标准

1. mapping 运行时读取不再依赖 `data/config/*.json`
2. mapping 保存不再写本地 JSON
3. 5 个 profile 在 DB 中都有有效 published revision
4. source analysis、PO generation、打印预览结果与迁移前一致
5. 文档与代码边界一致
