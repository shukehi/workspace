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

### 6. 落成首个 rule adapter / explain / playground 原型

已完成：

- 新增 accessory 规则 adapter：
  - `src/services/mappings/mappingRules.adapter.ts`
- 新增 rule explain 服务：
  - `src/services/mappings/mappingRules.explain.ts`
- 新增 explain composable：
  - `src/features/config-editor/composables/useRuleExplainPreview.ts`
- 在 `CylinderConfig` 中新增“规则试跑”区块：
  - `src/views/CylinderConfig.vue`
- 新增测试：
  - `tests/mapping-rules-adapter.test.ts`
  - `tests/mapping-rules-explain.test.ts`
  - `tests/cylinder-config-playground-guard.test.ts`

当前能力：

- `cylinder.secondaryAccessoryPackRules` 可被转换为统一 `MappingRuleSet`
- explain 会输出：
  - `traces`
  - `winningRules`
  - 最终 `output`
- explain 输出已纳入 `ruleSet.defaults`
- accessory 规则的 `scope` 与 `then.code` 已完成语义修正
- `CylinderConfig` 页面可直接输入样本字段查看命中轨迹与最终输出

验证：

- `tests/mapping-rules-adapter.test.ts`
- `tests/mapping-rules-explain.test.ts`
- `tests/cylinder-config-playground-guard.test.ts`
- `npm run type-check`

### 7. 抽通用 playground 组件，并接入多个配置页

已完成：

- 新增通用规则试跑组件：
  - `src/features/config-editor/components/RuleExplainPlayground.vue`
- `useRuleExplainPreview` 增强：
  - 支持 typed field definition
  - 支持 `meta.*` 写入
  - 支持字段级 `setValue`
- `CylinderConfig` 改为使用通用试跑组件
- `LockConfig` 也已接入同一套试跑组件
- `LockForkConfig` 已新增锁具类型规则试跑
- `LockConfig` 页面语义已从“测试匹配”收口为“规则试跑”

验证：

- `tests/cylinder-config-playground-guard.test.ts`
- `tests/lock-config-playground-guard.test.ts`
- `tests/lock-fork-config-playground-guard.test.ts`
- `npm run type-check`

### 8. 共享 rule executor 已落地并进入真实业务入口

已完成：

- 新增共享执行内核：
  - `src/services/mappings/mappingRules.execute.ts`
- 新增执行结果类型：
  - `src/types/mappingRules.ts`
- `mappingRules.explain.ts` 已改为复用执行内核，不再单独维护一套求值逻辑
- `extractLockData()` 已切到：
  - `adaptLockMappingsToRuleSet`
  - `executeRuleSet`
- `extractCylinderAccessoryPackData()` 已切到：
  - `adaptCylinderAccessoryPackRulesToRuleSet`
  - `collectRuleExecution`
  - 单规则 `executeRuleSet`

当前含义：

- 规则系统已不再停留在配置页 explain 原型
- 已进入两个真实业务入口：
  - `lock` 提取
  - `cylinder accessory` 提取
- explain / preview / 提取逻辑已开始共享同一套规则求值核心

验证：

- `tests/mapping-rules-execute.test.ts`
- `tests/mapping-rules-explain.test.ts`
- `tests/lock-extraction.test.ts`
- `tests/cylinder-accessory-pack-extraction.test.ts`
- `npm run type-check`

### 9. source analysis 展示层已接入规则命中结果

已完成：

- `useSourceStore` 暴露 `flatAccessories`
- `Materials` 页补齐硬件分析展示：
  - `Locks (锁具)`
  - `Handles (拉手)`
  - `Accessories (五金配件)`
- `lock` 与 `accessory` 提取结果现在会带上：
  - `matchedRules`
  - `winningRules`
- `Materials` 页表格已可直接展示 `winningRules`

涉及文件：

- `src/stores/useSourceStore.ts`
- `src/components/materials/MaterialColumns.ts`
- `src/views/Materials.vue`
- `src/lib/erp-engine/dataExtractors.ts`

验证：

- `tests/materials-page-hardware-sections.test.ts`
- `tests/lock-extraction.test.ts`
- `tests/cylinder-accessory-pack-extraction.test.ts`
- `tests/source/sourceAnalysis.spec.ts`
- `tests/source-store-workflow.test.ts`
- `tests/source-analysis-runtime.test.ts`
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
- 统一规则 DTO 与 validator 已落地
- accessory / lock / lock_fork 规则 adapter 已落地
- explain 原型与通用 playground 组件已落地
- `CylinderConfig` / `LockConfig` / `LockForkConfig` 已接入试跑
- shared rule executor 已落地
- `lock` 与 `cylinder accessory` 提取已接入真实业务路径
- `sourceAnalysis` 页已能展示 lock / handle / accessory 结果，并显示部分规则命中信息

### 10. lock_fork 锁具类型识别已接入真实规则执行

已完成：

- `extractLockForkData()` 的锁具类型识别部分已改为通过：
  - `adaptLockForkMapping`
  - `adaptLockForkTypeRulesToRuleSet`
  - `executeRuleSet`
- 当前仅接入“锁具类型识别”层，不改变：
  - 门厚尺寸
  - 高门高规则
  - 吊脚 / 平下档
  - 边型修饰

涉及文件：

- `src/lib/erp-engine/dataExtractors.ts`
- `tests/lock-fork-extraction.test.ts`

验证：

- `tests/lock-fork-extraction.test.ts`
- `npm run type-check`

当前含义：

- 统一规则执行已进入第三条真实业务链路：
  - `lock`
  - `cylinder accessory`
  - `lock_fork` 的锁具类型识别
- `lock_fork` 结果现在也会带上：
  - `matchedRules`
  - `winningRules`
- `Materials` 页锁叉表已能展示锁叉结果对应的规则命中信息
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
4. 如继续推进规则系统，下一步优先考虑：
   - 继续把 `lock_fork` 的更多派生逻辑接入规则执行
   - 或把更多 rule execution 元信息扩展到 source analysis 展示层
