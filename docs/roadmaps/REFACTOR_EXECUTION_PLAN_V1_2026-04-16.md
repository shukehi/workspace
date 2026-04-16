# 重构执行路线图 v1（2026-04-16）

> 适用仓库：`/Users/aries/Dve/workspace`
>
> 目标：在不推倒重来的前提下，以小步、可回滚、可验证的方式，完成当前项目的结构性重构。

---

## 1. 重构总原则

1. **先修地面，再拆结构**
   - 先恢复可信门禁，再做高风险结构性改动。
2. **一次只打一个主热点**
   - 不并行拆多个高风险域。
3. **页面壳 / store / domain / repository 边界持续变硬**
4. **每周都必须可回滚**
5. **每周都必须有明确验收**

---

## 2. 当前核心问题判断

当前仓库最关键的问题不是“结构不优雅”，而是这 4 个问题：

1. **质量门禁不可信**
   - `npm run type-check:server` 失败
   - `npm test` 失败
2. **复杂度集中在少数热点文件**
   - `src/views/Inventory.vue`
   - `src/lib/erp-engine/dataExtractors.ts`
   - `server/services/orders/order.service.ts`
3. **运行时依赖契约不够清晰**
   - config runtime
   - ERP fresh fetch / cache
   - print/PDF
   - API_KEY
4. **文档状态与实际仓库状态漂移**
   - docs 写 completed，不代表当前仓库真健康

因此重构顺序是：

**先恢复可信反馈地面 → 再拆热点 → 再统一运行时契约 → 最后做结构收口**

---

## 3. 总阶段概览

### Phase 0：恢复可信反馈地面
目标：让仓库重新“可测、可判定、可验收”。

### Phase 1：收口运行时契约
目标：把 config / ERP / print / auth 的依赖边界讲清楚并固定下来。

### Phase 2：拆前端最大热点
目标：优先拆 `Inventory.vue`。

### Phase 3：拆后端最大热点
目标：优先拆 `OrderService`。

### Phase 4：重构 source-analysis 规则层
目标：把 `dataExtractors.ts` 拆成按领域组织的规则引擎边界。

### Phase 5：统一 config workflow 心智
目标：让 formulas / mappings / materials 的 workflow contract 更统一。

### Phase 6：文档与治理收口
目标：让 docs、门禁、当前实现一致。

---

## 4. 周计划

## Week 1：恢复仓库健康基线

### 目标
把“当前项目是不是健康的”这件事重新变成可回答的问题。

### 要做的事
1. 建立真实健康基线文档
   - 建议文件：`docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`
2. 修复 `type-check:server`
3. 修复当前 failing tests

### 本周不做
- 不做页面大拆
- 不做 source-analysis 大改
- 不做 orders/inventory 大重构

### 验收
```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

---

## Week 2：收口运行时契约

### 目标
把“系统依赖什么才能正常工作”写清楚、代码也更清楚。

### 重点对象
- `src/main.ts`
- `src/services/configRuntime.ts`
- `src/services/configLoader.ts`
- `src/services/configRepository.ts`
- `server/config/env.ts`
- `server/config/index.ts`
- `server/app/middleware/apiKeyAuth.ts`
- `server/services/renderBaseUrl.ts`
- `server/index.ts`
- `src/features/source-analysis/services/sourceContractService.ts`
- `server/routes/api.ts`
- `server/routes/contracts.ts`
- `server/services/ContractCacheService.ts`
- `server/routes/pdf.ts`
- `server/services/pdfGenerator.ts`
- `src/views/PrintDocument.vue`

### 产出建议
- `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`

### 验收
- 配置/ERP/print 依赖边界可用一页文档说清
- 相关测试仍全部通过
- 没有新增双重语义接口

---

## Week 3：拆 Inventory 前端热点

### 目标
把 `src/views/Inventory.vue` 从超重页面降为“页面壳”。

### 重点文件
现有：
- `src/views/Inventory.vue`
- `src/stores/useInventoryStore.ts`

新增建议：
- `src/features/inventory/composables/useInventoryPageState.ts`
- `src/features/inventory/composables/useInventoryFilterState.ts`
- `src/features/inventory/composables/useInventoryOutboundFlow.ts`
- `src/features/inventory/composables/useInventoryMovementDrawer.ts`
- `src/features/inventory/composables/useInventoryExportActions.ts`
- `src/features/inventory/components/InventoryStockTab.vue`
- `src/features/inventory/components/InventoryReceiptsTab.vue`
- `src/features/inventory/components/InventoryOutboundsTab.vue`
- `src/features/inventory/components/InventoryLocationsTab.vue`

### 验收
- `Inventory.vue` 显著缩小
- 现有 inventory 测试继续通过
- 库存四个 tab 行为不回归

---

## Week 4：拆 OrderService 后端热点

### 目标
把 `server/services/orders/order.service.ts` 从复杂度中心变成编排中心。

### 重点文件
现有：
- `server/services/orders/order.service.ts`
- `server/services/orders/order.repository.ts`

已有可继续强化的文件：
- `server/services/orders/order.policy.ts`
- `server/services/orders/order.stockin.ts`
- `server/services/orders/order.dedupe.ts`
- `server/services/orders/order.template.ts`
- `server/services/orders/order.mapper.ts`
- `server/services/orders/order-create.validation.ts`
- `server/services/orders/order.query-policy.ts`

可新增：
- `server/services/orders/order.query.ts`
- `server/services/orders/order.application.ts`

### 验收
- `order.service.ts` 显著缩小
- orders 主链路测试全绿
- 入库、防重、状态迁移逻辑无回归

---

## Week 5：重构 source-analysis 规则层

### 目标
把 `src/lib/erp-engine/dataExtractors.ts` 从“大杂烩规则文件”拆成按领域组织的规则层。

### 重点文件
现有：
- `src/lib/erp-engine/dataExtractors.ts`
- `src/lib/erp-engine/materialDecomposer.ts`
- `src/services/sourceAnalysis.ts`

建议新增：
- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/lockExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`
- `src/lib/erp-engine/extractors/packagingExtractor.ts`

### 验收
- `dataExtractors.ts` 不再承载全部规则
- 相关规则测试全绿
- source-analysis 主链路行为不变

---

## Week 6：统一 config workflow

### 目标
让 formulas / mappings / materials 三套 workflow 的心智更一致。

### 重点文件
前端：
- `src/services/configLoader.ts`
- `src/services/configRepository.ts`
- `src/features/config-editor/components/ConfigPageLayout.vue`
- `src/features/config-editor/composables/useMappingConfigEditor.ts`

后端：
- `server/routes/formulasConfig.ts`
- `server/routes/mappingsConfig.ts`
- `server/routes/materialsConfig.ts`
- `server/services/formulas/formula.workflow.ts`
- `server/services/mappings/mapping.workflow.ts`
- `server/services/materials/materialCatalog.workflow.ts`

### 验收
- 三套配置 workflow 行为一致性提升
- config editor 壳层复用更稳定
- config runtime 真源说明更清晰

---

## Week 7：文档、治理、索引收口

### 目标
让仓库“当前状态”与“文档描述”一致。

### 重点文件
- `docs/README.md`
- `README.md`
- `docs/progress/*`
- `docs/reference/*`
- `docs/governance/*`

### 产出建议
- `docs/reference/CURRENT_SYSTEM_ARCHITECTURE_2026-04-16.md`
- `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`
- `docs/progress/REFACTOR_HEALTHBOARD_2026-04-16.md`

### 验收
- 新同学只读 docs 就能理解当前状态
- 不再出现“文档说全绿，仓库实际不全绿”的情况

---

## 5. 推荐 PR 拆分方式

### PR 1
- 修健康基线
- 修 `type-check:server`
- 修 failing tests

### PR 2
- runtime contract 收口
- 只做 config/ERP/print 边界澄清

### PR 3
- Inventory 页面拆分

### PR 4
- OrderService 拆分

### PR 5
- source-analysis extractor 拆分

### PR 6
- config workflow 统一

### PR 7
- docs / governance 收口

---

## 6. 每阶段统一验收标准

每周至少执行：

```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

并补：
1. 受影响主链路 smoke
2. `git status --short`
3. 相关文档同步
4. 记录剩余风险

---

## 7. 风险最高的 3 个点

### 1. OrderService 拆分
风险：采购主链路回归

### 2. source-analysis 规则拆分
风险：规则语义漂移

### 3. Inventory 页面拆分
风险：页面交互碎裂

---

## 8. 当前优先顺序

### 第一优先
**Week 1**
- 先把仓库健康度拉回真实可信

### 第二优先
**Week 3 + Week 4**
- 拆 `Inventory.vue`
- 拆 `OrderService`

### 第三优先
**Week 5**
- 拆 `dataExtractors.ts`

---

## 9. 一句话总结

这次重构不该是“全面推翻”，而应该是：

> **先修反馈系统，再拆主链路热点，再把规则层和配置层做成真正可维护的边界。**
