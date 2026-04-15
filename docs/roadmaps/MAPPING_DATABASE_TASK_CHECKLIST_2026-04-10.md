# Mapping Database Task Checklist

日期：2026-04-10

> 状态快照（2026-04-12）：
> - `P1`：已完成
> - `P2`：已完成
> - `P3`：核心代码与文档收口已基本完成，剩余主要是历史文档状态维护
> 详细进度请优先参考 [MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md](/Users/aries/Dve/workspace/docs/progress/MAPPING_PROCUREMENT_PROGRESS_2026-04-10.md)。

## 使用方式

按 `P1 -> P2 -> P3` 顺序推进。

- `P1`：先保证数据库 published 数据完整，并让运行时只读 DB
- `P2`：清理后端 legacy JSON 兼容层
- `P3`：收口编辑端、文档和最终测试

---

## P1

目标：运行时不再依赖 `data/config/*.json`，并确认 5 个 mapping profile 都有 published 数据。

### 任务

- [ ] 新增 `server/scripts/check_mapping_published_state.ts`
  - 输出 `packaging / cylinder / lock / lock_fork / handle` 的 published 状态
  - 输出 latest revision / published revision

- [ ] 新增 `server/scripts/seed_mapping_profiles.ts`
  - 从当前 `data/config/*.json` 初始化缺失的 published revision
  - 默认拒绝覆盖已有 published 数据

- [ ] 修改 `src/services/configRepository.ts`
  - 删除 mapping 的 legacy API fallback
  - 删除 mapping 的 `/data/*.json` fallback
  - `readMapping(kind)` 只读 `/api/config/mappings/:type/published`

- [ ] 修改 `src/services/configLoader.ts`
  - published 缺失时输出明确错误
  - 不再把 mapping 缺失视为可接受的静默降级

- [ ] 回归 `src/services/sourceAnalysis.ts`
  - 确认 source analysis 在 DB-only 下产出不变

- [ ] 回归 `src/services/poGenerator.ts`
  - 确认采购单生成在 DB-only 下产出不变

### 验收

- [ ] 5 个 profile 都有有效 published revision
- [ ] source analysis 不再依赖 JSON fallback
- [ ] PO generation 不再依赖 JSON fallback
- [ ] 真实合同样本结果不变

### 阻塞条件

- 任一 profile 缺 published revision

---

## P2

目标：后端 legacy 配置接口不再读写 `data/config/*.json`。

### 任务

- [ ] 修改 `server/routes/configData.ts`
  - 删除 `readLegacyMappingRuntime(...)`
  - 删除 mapping 相关 `ensureJsonFile(...)`
  - 删除 `syncLegacyRuntimeFile(...)` 调用
  - legacy mapping GET/PUT 仅做 workflow 转发

- [ ] 修改 `server/services/mappings/mapping.workflow.ts`
  - 删除或废弃 `seedFromLegacyPayload`
  - 删除或废弃 `ensurePublishedMapping`
  - 删除或废弃 `syncLegacyRuntimeFile`
  - `getPublishedMapping()` 无 published 时返回明确错误

- [ ] 修改 `server/config/paths.ts`
  - 将 mapping JSON 路径降级为 seed source only
  - 如确认无运行时用途，移除对应常量

- [ ] 修改 `server/services/mappings/index.ts`
  - 清理废弃兼容导出

### 测试

- [ ] 更新 `tests/config-routes.test.ts`
  - legacy route 不再写 JSON

- [ ] 更新 `tests/mapping-routes.test.ts`
  - published/detail/draft/publish/rollback 行为一致
  - published 缺失时报错明确

### 验收

- [ ] mapping 保存动作不再写本地 JSON
- [ ] legacy route 即使保留，也只依赖 workflow
- [ ] workflow 不再自动从 JSON seed

### 阻塞条件

- 仍有页面或脚本强依赖 legacy route 的旧返回形状

---

## P3

目标：编辑端、文档、测试全部收口，完成数据库化迁移。

### 任务

- [ ] 修改 `src/services/mappingConfigApi.ts`
  - 确认 workflow 是唯一读写入口

- [ ] 修改 `src/features/config-editor/composables/useMappingConfigEditor.ts`
  - 统一依赖 latest/draft/published revision
  - 清理 legacy 响应形状兼容逻辑

- [ ] 回归各配置页面
  - [ ] `src/views/CylinderConfig.vue`
  - [ ] `src/views/LockConfig.vue`
  - [ ] `src/views/LockForkConfig.vue`
  - [ ] `src/views/HandleConfig.vue`
  - [ ] 包装配置对应页面

- [ ] 更新 `docs/reference/api.md`
  - mapping workflow API 标为唯一正式真源

- [ ] 更新治理/迁移文档
  - [ ] `docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
  - [ ] `docs/reference/CYLINDER_RULES.md`
  - [ ] `docs/reference/LOCK_RULES.md`
  - [ ] `docs/reference/LOCK_FORK_RULES.md`

### 测试

- [ ] 更新 `tests/source-analysis-runtime.test.ts`
- [ ] 更新 `tests/po-generator-integration.test.ts`
- [ ] 更新 `tests/order-routes.test.ts`
- [ ] 更新 `tests/inventory-route.test.ts`

### 验收

- [ ] mapping 运行时只读 DB published
- [ ] mapping 编辑只走 workflow
- [ ] 文档中不再把 JSON 描述为真源
- [ ] 关键业务链路回归通过

---

## 推荐执行节奏

### 第一天

- 完成 `P1`

### 第二天

- 完成 `P2`

### 第三天

- 完成 `P3`

---

## 最终完成标准

- [ ] 5 个 profile 在数据库里都有有效 published revision
- [ ] mapping 运行时读取不再依赖 `data/config/*.json`
- [ ] mapping 保存不再写 `data/config/*.json`
- [ ] source analysis / PO generation / 打印预览结果不变
- [ ] API、代码、文档边界一致
