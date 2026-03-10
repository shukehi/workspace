# Source/配置重构阶段性总结（2026-03-10）

## 目标

本轮重构围绕 4 个核心问题推进：

1. `useSourceStore` 职责过重，主链耦合过深
2. `configLoader` 同时承担配置加载、fallback 和运行时消费，数据源边界不清
3. 后端 `materials` 仍停留在 legacy 文件写入模型，没有纳入统一版本化配置体系
4. `Procurement.vue` 页面职责过多，视图层维护成本高

本阶段的目标不是一次性完成全量架构重写，而是优先把最重的耦合点拆开，建立后续迁移的稳定边界。

## 已完成项

### 1. Source 主链拆层

已完成：

- 将材料/五金分析从 [`src/stores/useSourceStore.ts`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts) 抽离为纯分析服务
- 新增 [`src/services/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysis.ts)
- 新增 [`src/services/sourceAnalysisConfig.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysisConfig.ts)
- 新增 [`src/types/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/types/sourceAnalysis.ts)
- 将历史合同列表与分页状态拆到 [`src/stores/useContractHistoryStore.ts`](/Users/aries/Dve/workspace/src/stores/useContractHistoryStore.ts)
- 将 [`src/components/source/ContractHistoryDialog.vue`](/Users/aries/Dve/workspace/src/components/source/ContractHistoryDialog.vue) 切到新 store

结果：

- `useSourceStore` 已从“业务主链 + 分析计算 + 历史合同”收缩为“当前合同状态 + 分析调度 + 历史合同加载桥接”
- Source / Materials / 历史合同三类状态边界已明显清晰

### 2. 前端配置读取收口

已完成：

- 新增 [`src/services/configRepository.ts`](/Users/aries/Dve/workspace/src/services/configRepository.ts)
- 新增 [`src/services/configRuntime.ts`](/Users/aries/Dve/workspace/src/services/configRuntime.ts)
- 新增 [`src/services/packagingConfig.ts`](/Users/aries/Dve/workspace/src/services/packagingConfig.ts)
- `configLoader` 已经通过 repository 读取配置，并暴露 `getLoadSources()`
- 材料目录读取优先走 `/api/config/material-catalog/published`，旧 `/api/config/materials` 退为兼容层
- 页面和业务代码中对 `configLoader` 的直接依赖已大幅减少

典型消费方已切换：

- [`src/main.ts`](/Users/aries/Dve/workspace/src/main.ts)
- [`src/components/procurement/EditOrderDialog.vue`](/Users/aries/Dve/workspace/src/components/procurement/EditOrderDialog.vue)
- [`src/features/procurement/prepareOrderDraft.ts`](/Users/aries/Dve/workspace/src/features/procurement/prepareOrderDraft.ts)
- [`src/services/poGenerator.ts`](/Users/aries/Dve/workspace/src/services/poGenerator.ts)
- [`src/views/PackagingConfig.vue`](/Users/aries/Dve/workspace/src/views/PackagingConfig.vue)
- [`src/views/CylinderConfig.vue`](/Users/aries/Dve/workspace/src/views/CylinderConfig.vue)
- [`src/views/HandleConfig.vue`](/Users/aries/Dve/workspace/src/views/HandleConfig.vue)
- [`src/views/LockForkConfig.vue`](/Users/aries/Dve/workspace/src/views/LockForkConfig.vue)

结果：

- 前端“配置加载实现”和“配置消费接口”已开始分层
- 页面读到的配置来源可追踪，不再完全依赖隐式 fallback

### 3. Materials 后端版本化工作流

已完成：

- 新增模型：
  - [`server/models/MaterialCatalogProfile.js`](/Users/aries/Dve/workspace/server/models/MaterialCatalogProfile.js)
  - [`server/models/MaterialCatalogRevision.js`](/Users/aries/Dve/workspace/server/models/MaterialCatalogRevision.js)
  - [`server/models/MaterialCatalogAuditLog.js`](/Users/aries/Dve/workspace/server/models/MaterialCatalogAuditLog.js)
- 新增服务：
  - [`server/services/materials/materialCatalog.repository.js`](/Users/aries/Dve/workspace/server/services/materials/materialCatalog.repository.js)
  - [`server/services/materials/materialCatalog.workflow.js`](/Users/aries/Dve/workspace/server/services/materials/materialCatalog.workflow.js)
  - [`server/services/materials/index.js`](/Users/aries/Dve/workspace/server/services/materials/index.js)
- 新增路由：
  - [`server/routes/materialsConfig.js`](/Users/aries/Dve/workspace/server/routes/materialsConfig.js)
- legacy [`server/routes/configData.js`](/Users/aries/Dve/workspace/server/routes/configData.js) 已接入 workflow 骨架

当前支持的 materials workflow：

- 首次从 legacy JSON seed
- 获取 published 配置
- 获取 detail
- 更新 draft
- 发布 draft
- 查询 revisions
- 查询 audit logs

当前审计动作：

- `seed_legacy`
- `update_draft`
- `publish`

结果：

- `materials` 已经不再只是“文件读写式配置”
- 新旧接口之间已有明确的迁移桥梁

### 4. Materials 前端管理入口

已完成：

- 新增页面 [`src/views/MaterialCatalogConfig.vue`](/Users/aries/Dve/workspace/src/views/MaterialCatalogConfig.vue)
- 新增路由 `/config/material-catalog`
- 新增导航入口“物料目录配置”
- 发布后通过 [`src/services/configRuntime.ts`](/Users/aries/Dve/workspace/src/services/configRuntime.ts) 刷新运行时材料目录
- [`src/services/sourceAnalysisConfig.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysisConfig.ts) 现在会刷新材料目录后再组装分析快照

结果：

- materials 版本化工作流已经有前端入口，不再只是后端能力
- 保存后运行时配置能立即生效，避免“发布了但分析还是旧数据”

### 5. Procurement 页面 feature 化

已完成：

- 抽出展示块：
  - [`src/components/procurement/ProcurementSummaryCards.vue`](/Users/aries/Dve/workspace/src/components/procurement/ProcurementSummaryCards.vue)
  - [`src/components/procurement/ProcurementFilterBar.vue`](/Users/aries/Dve/workspace/src/components/procurement/ProcurementFilterBar.vue)
  - [`src/components/procurement/ProcurementBulkActionBar.vue`](/Users/aries/Dve/workspace/src/components/procurement/ProcurementBulkActionBar.vue)
- 抽出弹窗编排：
  - [`src/features/procurement/useProcurementDialogs.ts`](/Users/aries/Dve/workspace/src/features/procurement/useProcurementDialogs.ts)
- 抽出页面状态：
  - [`src/features/procurement/useProcurementPageState.ts`](/Users/aries/Dve/workspace/src/features/procurement/useProcurementPageState.ts)

结果：

- [`src/views/Procurement.vue`](/Users/aries/Dve/workspace/src/views/Procurement.vue) 已从“大而全页面”收缩为 feature shell
- 页面现在主要负责子组件装配、列定义和少量事件连接

## 验证结果

本阶段已通过的关键验证包括：

- `npm run type-check`
- `node --test tests/materials-workflow.test.js`
- `node --test tests/config-routes.test.js`
- `npx tsx --test tests/source/sourceAnalysis.spec.ts`
- `npx tsx --test tests/config-loader-mapping.test.ts`
- `npx tsx --test tests/po-generator-integration.test.ts`
- `npx tsx --test tests/po-rule-packaging.test.ts`
- `npx tsx --test tests/procurement-page-state.test.ts tests/procurement-dialogs.test.ts`

新增的回归测试：

- [`tests/source/sourceAnalysis.spec.ts`](/Users/aries/Dve/workspace/tests/source/sourceAnalysis.spec.ts)
- [`tests/materials-workflow.test.js`](/Users/aries/Dve/workspace/tests/materials-workflow.test.js)
- [`tests/config-routes.test.js`](/Users/aries/Dve/workspace/tests/config-routes.test.js)
- [`tests/procurement-page-state.test.ts`](/Users/aries/Dve/workspace/tests/procurement-page-state.test.ts)
- [`tests/procurement-dialogs.test.ts`](/Users/aries/Dve/workspace/tests/procurement-dialogs.test.ts)

## 对应提交序列

本阶段关键提交：

- `1be6c76` `refactor(source): extract analysis pipeline from source store`
- `a002d51` `refactor(source): separate contract history state from source store`
- `c0d5130` `refactor(config): narrow frontend config access behind facades`
- `ec03f77` `feat(materials): add versioned catalog workflow and route coverage`
- `c3f5978` `feat(materials): add audit logs for catalog workflow`
- `6e66d6c` `feat(materials): add catalog config management page`
- `0b8b599` `refactor(procurement): extract page presentation sections`
- `bfcc34f` `refactor(procurement): extract dialog orchestration`
- `6f596b9` `refactor(procurement): extract page state composition`
- `71f5563` `test(procurement): cover extracted page composables`

## 当前未完成项

以下事项仍未结束：

1. `configLoader` 仍然存在兼容期语义，虽然消费面已收口，但尚未彻底消除前端 fallback 责任
2. `materials` workflow 目前已有 revision 和 audit，但尚未扩展到更完整的治理能力，例如更细粒度校验、权限/操作人体系、历史版本对比
3. 其他配置域仍然存在“双轨制”，尚未像 `materials` 一样向统一版本化模型收口
4. Procurement 页面虽然已拆层，但 `EditOrderDialog.vue` 和 `ProcurementPreviewModal.vue` 本身仍偏重，后续仍可继续 feature 化

## 下一阶段建议

建议按下面顺序推进：

1. 收敛前端配置真源
   - 明确哪些配置必须只读 workflow/published 接口
   - 将更多 `configLoader` 读法替换为更窄的 facade

2. 继续统一后端配置域
   - 评估将其他 legacy `/api/config/*` 配置逐步纳入版本化模型
   - 明确 legacy 接口的退场策略

3. 继续拆 Procurement 细项
   - 评估 [`src/components/procurement/EditOrderDialog.vue`](/Users/aries/Dve/workspace/src/components/procurement/EditOrderDialog.vue) 的进一步拆分
   - 评估 [`src/components/procurement/ProcurementPreviewModal.vue`](/Users/aries/Dve/workspace/src/components/procurement/ProcurementPreviewModal.vue) 的打印/导出逻辑下沉

## 结论

这轮重构已经从“识别问题”进入“建立新边界”的阶段。

目前最关键的变化不是文件数量变多，而是主业务链、配置读取链和采购页面结构都已经具备了继续演进的基础。后续重构可以沿着这些新边界继续推进，而不必再从最重的耦合点重新开刀。
