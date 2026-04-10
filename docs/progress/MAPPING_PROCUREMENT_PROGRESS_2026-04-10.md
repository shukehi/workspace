# Mapping / Procurement Progress (2026-04-10)

## 本次完成项

### 1. 采购预览支持复制截图到系统剪贴板

已完成：

- 在采购预览弹窗新增“复制截图”动作
- 后端新增截图接口，复用 `/print-document` 渲染链路
- 截图范围已从整页收紧到订单区域
- 清理了“订单号文本一起复制”的冗余逻辑，当前行为与实际粘贴表现一致

涉及文件：

- `src/components/procurement/ProcurementPreviewModal.vue`
- `src/features/procurement/useProcurementPreview.ts`
- `src/features/procurement/composables/useOrderActions.ts`
- `src/lib/api.ts`
- `src/views/PrintDocument.vue`
- `server/routes/pdf.ts`
- `server/services/pdfGenerator.ts`

验证：

- `tests/procurement-order-actions.test.ts`
- `tests/procurement-preview.test.ts`
- `tests/procurement-layout-guard.test.ts`
- `npm run type-check`
- 手动验证 `/api/pdf/screenshot` 返回 PNG

### 2. 修复采购页订单号搜索清空后仍保留筛选的问题

已完成：

- 修复路由 query 同步逻辑
- 修复 store 查询参数合并导致的 stale filter 残留
- 清空搜索后会正确恢复到未筛选状态

涉及文件：

- `src/features/procurement/composables/useProcurementRouteQuery.ts`
- `src/stores/useProcurementStore.ts`

验证：

- `tests/procurement-route-query.test.ts`
- `tests/procurement-store-fetch-orders-query.test.ts`
- `npm run type-check`
- 浏览器回归确认 `status=arrived` 下输入单号后缩到 1 条，清空后恢复到 7 条

### 3. 完成一轮针对 accessory / auto order 的 review 修复

修复内容：

- `五金/配件` accessory 订单项不再生成不可入库的复合 `material_id`
- accessory 规则改为按门厚提供显式 `materialCode`
- `conditionField` 运行时生效，不再只硬编码 `fshz`
- `POGenerator.createOrders()` 的批次占位单号改为按批次递增，不再全部是 `-01`

涉及文件：

- `src/lib/erp-engine/dataExtractors.ts`
- `src/services/poContractUtils.ts`
- `src/services/poGenerator.ts`
- `src/services/po-rules/accessoryRule.ts`
- `src/types/mapping.ts`
- `src/views/CylinderConfig.vue`
- `data/config/cylinder-mapping.json`
- `shared/mappings/mapping-adapter-core.js`
- `shared/mappings/mapping-adapter-core.mjs`
- `shared/mappings/mapping-validator-core.js`
- `shared/mappings/mapping-validator-core.mjs`

验证：

- `tests/cylinder-accessory-pack-extraction.test.ts`
- `tests/po-generator-integration.test.ts`
- `tests/mapping-validator.test.ts`
- `tests/mapping-server-validator.test.ts`
- `npm run type-check`

说明：

- accessory `materialCode` 现在已成为规则契约的一部分
- 真实环境仍需保证对应编码存在于 `materials` 表中，才能完整跑通入库

### 4. 新增 mapping 数据库化与规则化方案文档

已新增：

- `docs/roadmaps/MAPPING_DATABASE_MIGRATION_PLAN_2026-04-10.md`
- `docs/roadmaps/MAPPING_DATABASE_FILE_EXECUTION_PLAN_2026-04-10.md`
- `docs/roadmaps/MAPPING_DATABASE_TASK_CHECKLIST_2026-04-10.md`
- `docs/roadmaps/MAPPING_RULE_OPTIMIZATION_PLAN_2026-04-10.md`
- `docs/roadmaps/MAPPING_RULE_DTO_DRAFT_2026-04-10.md`

作用：

- 明确 mapping 收口到数据库的阶段计划
- 明确统一规则模型的方向
- 提供 P1/P2/P3 的可执行任务清单

### 5. 落成 mapping rule DTO 与 validator 草案

已完成：

- 新增统一规则类型：
  - `src/types/mappingRules.ts`
- 新增规则校验器：
  - `src/services/mappings/mappingRules.validator.ts`
- 对外导出：
  - `src/services/mappings/index.ts`
- 新增最小测试：
  - `tests/mapping-rules-validator.test.ts`

当前能力：

- 校验 `ruleSet.metadata`
- 校验 `rule.id / profile / stage / scope / priority`
- 校验 `when` 条件树
- 校验 `then` 输出和 `quantityFormula`
- 检测重复 `rule.id`
- 检测 rule/profile 不匹配

验证：

- `tests/mapping-rules-validator.test.ts`
- `npm run type-check`

## 本次提交

本次相关提交：

- `8043057` Enable clipboard-ready procurement preview captures
- `23ddfb4` Align preview clipboard behavior with image-only paste targets
- `0107107` Fix accessory generation and auto order placeholders

## 当前状态判断

### Procurement

- 预览截图复制能力已可用
- 搜索清空回退行为已恢复正确
- accessory 相关生成逻辑已具备更稳定的 contract

### Mapping

- 数据库化方案已形成
- 规则优化方向已形成
- 统一规则 DTO 与 validator 处于“草案可编译”状态
- `P1` 已完成：
  - mapping runtime 只读 published
  - published 状态可检查
  - draft-only / 缺 published 可通过 seed/check 脚本治理
  - 前端启动在缺 published 时会 fail closed
- `P2` 已完成：
  - legacy mapping route 不再读写 `data/config/*.json`
  - legacy route 已退化为 workflow 兼容壳
  - workflow 中旧的 seed/file-sync 兼容函数已移除

## 剩余建议

1. 补齐 accessory `materialCode` 对应的 `materials` 主数据
2. 跑一次完整真实链路：
   - source analysis
   - 采购单生成
   - arrive
   - stock-in
3. 如继续推进 mapping 数据库化，下一步进入 `P3`：文档与配置页周边语义收口
4. 如继续推进规则系统，优先实现 `mappingRules.adapter.ts`
