# Source 与配置域重构计划（2026-03-10）

## 1. 目标

在不改变现有业务结果的前提下，完成 Source 主链、配置加载策略、后端配置持久化边界和采购页结构的分阶段重构，使项目满足以下要求：

1. `useSourceStore` 回归单一职责，不再同时承担合同拉取、缓存、历史列表和分析编排。
2. 前端配置读取具备清晰的数据源策略，避免默认混用 API 与静态 JSON fallback。
3. 后端配置域逐步从文件写入式接口迁移到统一的版本化持久化模型。
4. 大型页面回归 feature 化组合，页面层只保留组合逻辑，不继续堆叠实现细节。

## 1.1 非目标与执行边界

本轮重构不包含以下内容：

1. 不重写 ERP 取数协议，不改动 `/getOutContractDetail` 的业务语义。
2. 不主动修改材料分解算法、五金提取规则、PO 生成规则和打印模板字段。
3. 不做 UI 视觉改版，采购页拆分仅限于结构和职责，不改变既有交互语义。
4. 不一次性移除所有兼容接口，允许保留过渡层，但必须明确标注其生命周期。

执行约束：

1. 如果重构导致材料分析结果变化，默认视为回归，必须先证明是历史配置源不一致，而不是逻辑被误改。
2. 所有阶段都必须保留可回滚点，避免将“职责拆分”和“业务行为修改”捆绑提交。
3. 允许在过渡期保留 facade 或 adapter，但禁止继续新增跨层耦合。

## 2. 当前问题确认

### P0

1. `src/stores/useSourceStore.ts` 同时处理合同拉取、本地快照、后端缓存、历史合同分页、材料计算和五金提取，职责明显过载。
2. `src/services/configLoader.ts` 同时装载 `materials`、`formulas` 和 4 类 mapping，并且默认混用 `/api/config/*` 与 `/data/*` fallback，数据源策略不透明。
3. 后端配置路由同时存在版本化模型和文件写入式接口，两套持久化方式并行，权威来源边界不清晰。

### P1

1. `src/views/Procurement.vue` 已承担筛选、统计、批量操作、弹窗编排、预览同步和导出等多类职责，页面膨胀明显。
2. Source 主链依赖全局 `configLoader` 实例，导致分析逻辑难以单测，也不利于后续替换配置来源。
3. Mapping 域同时存在 workflow 路由和 runtime 文件接口，维护者需要理解两套读取路径。

## 3. 问题证据

### 3.1 Source Store 过重

关键位置：

1. [`src/stores/useSourceStore.ts:50`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L50) 定义单个 store，内部同时承载当前合同、分析结果、历史合同列表和分页筛选状态。
2. [`src/stores/useSourceStore.ts:94`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L94) 的 `applyContractData()` 同时设置合同、写本地快照、调用后端缓存接口并触发分析。
3. [`src/stores/useSourceStore.ts:148`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L148) 与 [`src/stores/useSourceStore.ts:183`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L183) 将历史合同分页与历史合同加载塞进同一 store。
4. [`src/stores/useSourceStore.ts:214`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L214) 的 `calculateMaterials()` 直接拉配置、刷新公式、执行材料分解并提取五金。

结论：

1. 当前 Source store 是主业务链的耦合中心。
2. 拆开后能够同时降低 Source、Materials、合同历史和 PO 生成链路的复杂度。

### 3.2 配置加载策略不清晰

关键位置：

1. [`src/services/configLoader.ts:38`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L38) 的 `loadAll()` 将材料、mapping、formulas 的装载逻辑集中在一个 service 中。
2. [`src/services/configLoader.ts:62`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L62) 的 `loadMaterials()` 先读 `/api/config/materials`，失败后回退到 `/data/materials-catalog.json`。
3. [`src/services/configLoader.ts:128`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L128) 至 [`src/services/configLoader.ts:172`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L172) 的 mapping 加载逻辑均是 API 优先、静态文件兜底。
4. [`src/services/configLoader.ts:74`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L74) 至 [`src/services/configLoader.ts:89`](/Users/aries/Dve/workspace/src/services/configLoader.ts#L74) 的公式加载逻辑只走 API，但失败时保留旧内存值，策略又与其他配置不同。

结论：

1. 当前 loader 不是“单一真源”，而是“多源兜底”。
2. 前端消费方无法明确知道当前拿到的配置来自哪里。

### 3.3 后端配置域双轨制

关键位置：

1. [`server/routes/index.js:15`](/Users/aries/Dve/workspace/server/routes/index.js#L15) 同时挂载 `/api/config/formulas`、`/api/config/mappings` 和 `/api/config`。
2. [`server/routes/configData.js:27`](/Users/aries/Dve/workspace/server/routes/configData.js#L27) 开始定义 runtime 文件路径，并通过 `fs.readFileSync` / `fs.writeFileSync` 直接读写材料和 mapping 文件。
3. [`server/models/index.js:5`](/Users/aries/Dve/workspace/server/models/index.js#L5) 已存在 `FormulaDefinition/Revision`、`MappingProfile/Revision/AuditLog` 等版本化模型。

结论：

1. 当前后端同时维护“版本化数据库配置”和“文件式配置”两种事实来源。
2. 材料目录仍停留在 legacy 模式，mapping 也存在 workflow 与 runtime 文件双通道。

### 3.4 Procurement 页面膨胀

关键位置：

1. [`src/views/Procurement.vue:56`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L56) 统计卡片逻辑在页面内计算。
2. [`src/views/Procurement.vue:89`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L89) 页面内处理筛选、搜索和结果派生。
3. [`src/views/Procurement.vue:113`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L113) 至 [`src/views/Procurement.vue:253`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L113) 集中处理单条操作、批量操作、预览和编辑状态同步。
4. [`src/views/Procurement.vue:279`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L279) 至 [`src/views/Procurement.vue:448`](/Users/aries/Dve/workspace/src/views/Procurement.vue#L279) 保留完整模板，页面整体已达 448 行。

结论：

1. 这是典型的 feature shell 未完成拆分的状态。
2. 但它主要是维护性问题，优先级应排在 Source 与配置域治理之后。

## 4. 重构原则

1. 先拆依赖边界，再拆文件大小。文件变短不是目标，职责清晰才是目标。
2. 先治理主链耦合，再治理页面结构。优先处理影响 Source、Materials、PO 生成、历史合同的交叉点。
3. 配置读取必须显式表达来源策略，不能继续默认“读不到 API 就自动切本地文件”。
4. 新增的抽象层必须可测试，至少支持对分析输入输出做稳定断言。
5. 每个阶段结束后，用户可感知行为应与现状一致，除非文档明确声明改变。

## 5. 分阶段方案

## 阶段 A：拆出 Source 分析层（P0，1 到 2 天）

目标：让分析逻辑脱离 `useSourceStore`，先降低主链耦合。

任务：

1. 新增独立的 Source 分析 service 或 composable，例如 `src/services/sourceAnalysis.ts` 或 `src/features/source/useSourceAnalysis.ts`。
2. 将材料分解和五金提取逻辑从 [`useSourceStore.ts`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts) 中迁出，形成纯输入输出接口，例如 `analyzeOrder(order, configSnapshot, items?)`。
3. 将 `flatMaterials`、`flatPackaging` 等衍生转换逻辑尽量跟随分析结果或视图适配层移动，不继续绑在主 store 上。
4. 保留 `useSourceStore` 作为外部兼容 facade，但其内部只做当前合同状态维护与分析触发。

建议产物：

1. `src/services/sourceAnalysis.ts`
2. `src/types/sourceAnalysis.ts`
3. 对应单元测试或快照测试

验收：

1. Source 页面、Materials 页面、PO 生成流程输出与现状一致。
2. `useSourceStore` 不再直接执行材料分解和五金提取细节。
3. 分析逻辑可在不初始化 Pinia 的情况下独立测试。

回滚点：

1. 保留旧 store 对外 API，不在本阶段同步重写所有调用方。

## 阶段 B：拆分 Source 合同与历史合同状态（P0，1 天）

目标：将“当前合同主链”和“历史合同浏览器”分离。

任务：

1. 提取当前合同相关状态，例如 `currentOrder`、`loading`、`error`、快照读写和 ERP 拉取逻辑，形成 `useSourceOrderStore`。
2. 提取历史合同分页、筛选、选中态和按合同号加载逻辑，形成 `useContractHistoryStore`。
3. 明确“从历史合同加载到当前合同”是一个显式动作，而不是共享同一堆内部状态。
4. 为过渡期保留旧 `useSourceStore` facade，将其改造成对两个子 store 的组合出口。

验收：

1. 合同历史弹窗仍可按分页、筛选、加载历史合同工作。
2. 当前合同切换不会无意影响历史列表内部状态。
3. store 边界可以用一句话解释清楚。

回滚点：

1. facade 层仍保留旧字段命名，允许页面分批迁移。

## 阶段 C：收敛前端配置读取策略（P0，1 到 2 天）

目标：前端只面对明确的数据源策略，不再直接感知“兼容期拼装”。

任务：

1. 将 [`configLoader.ts`](/Users/aries/Dve/workspace/src/services/configLoader.ts) 拆为 repository + loader 两层。
2. 定义统一接口，例如：
   - `getMaterials()`
   - `getPublishedFormulas()`
   - `getMapping(type)`
3. 新增 `ApiConfigRepository` 作为默认实现。
4. 如必须保留 fallback，新增 `FallbackConfigRepository` 或 adapter，并将启用条件显式化，例如仅开发环境或显式降级开关。
5. 为每次装载记录来源标识，便于日志和排障确认当前命中的数据源。

建议策略：

1. 短期采用“API 为唯一入口，后端内部决定是否兼容文件”。
2. 前端不再默认直接访问 `/data/*` 作为一线来源。

验收：

1. 配置消费方不再知道静态 JSON 文件路径。
2. `configLoader` 或其替代层可回答“当前值来自哪里”。
3. Source 分析和采购编辑等依赖方继续正常运行。

回滚点：

1. 允许保留旧 loader facade，将其内部切到 repository，新旧调用面暂时兼容。

## 阶段 D：统一后端配置持久化模型（P0，2 到 4 天）

目标：逐步结束“版本化数据库 + 文件写入”双轨制。

任务：

1. 明确哪些配置属于 workflow/revision 域，哪些仍处于 legacy 域，并形成迁移清单。
2. 为 `materials` 设计版本化模型，建议沿用 `profile + revision + audit` 思路，而不是继续直接写 JSON 文件。
3. 将 mapping 读取入口逐步统一到 workflow 服务，legacy runtime 文件接口仅保留过渡兼容。
4. 定义 published / draft / rollback 的统一语义，避免不同配置域行为不一致。
5. 完成 legacy 文件到数据库模型的导入脚本与一次性迁移方案。

建议新增内容：

1. `MaterialCatalogProfile`
2. `MaterialCatalogRevision`
3. 对应 service、route 和迁移脚本

验收：

1. `materials` 可通过统一版本化接口读取已发布版本。
2. mapping 与 formulas 的 published 读取链路风格一致。
3. `configData.js` 不再承担长期权威写入口。

回滚点：

1. 保留 legacy 文件快照和导入脚本，必要时可退回只读兼容。

## 阶段 E：采购页 feature 化拆分（P1，1 到 2 天）

目标：控制页面规模，隔离视图编排与局部交互状态。

任务：

1. 将筛选与搜索提取为 `useProcurementFilters` 或 `ProcurementFilterBar.vue`。
2. 将统计卡片提取为 `ProcurementSummaryCards.vue`。
3. 将批量操作条提取为 `ProcurementBulkActionBar.vue`。
4. 将编辑、预览、确认弹窗状态编排提取为 `useProcurementDialogs`。
5. 页面只保留 store 装配、事件连接和 layout 组织。

验收：

1. `Procurement.vue` 仅保留页面组合逻辑，不再内嵌大段事件处理。
2. 编辑、预览、批量操作行为不变。
3. 页面模板与状态编排更容易做局部测试。

回滚点：

1. 先抽 composable，再抽展示组件，避免一次性大改模板。

## 6. 推荐实施顺序

建议按以下顺序推进：

1. 阶段 A：先把分析逻辑从 Source store 中拿出来。
2. 阶段 B：再拆当前合同与历史合同状态。
3. 阶段 C：在主链边界稳定后，重构前端配置读取策略。
4. 阶段 D：随后统一后端配置持久化模型。
5. 阶段 E：最后处理采购页结构拆分。

原因：

1. 阶段 A 和 B 会先降低业务主链复杂度，并为后续配置治理腾出清晰依赖边界。
2. 阶段 C 若先做，容易把旧的 Source store 耦合继续包进新的 loader 里。
3. 阶段 E 收益明确，但不应抢在 P0 架构问题之前。

## 7. 第一刀的最小可交付版本

如果本周只做一轮低风险重构，建议限定为以下范围：

1. 抽离 `analyzeOrder(order, configSnapshot, items?)`。
2. 将历史合同列表与加载逻辑迁到独立 store。
3. 保留现有页面 API，不在同一提交中大面积改视图。

这样可以先切掉最大的耦合点，同时控制改动面。

## 8. 风险与应对

1. 风险：分析结果与现状出现细微差异。
   应对：为典型合同建立基线样本，比较材料汇总、五金提取和 PO 生成输出。

2. 风险：页面仍直接依赖旧 `useSourceStore` 字段。
   应对：保留 facade 过渡层，先内部重构，再逐步迁移页面调用。

3. 风险：配置真源切换后，部分页面读取旧 fallback 的隐式行为消失。
   应对：在日志中记录配置来源，并在切换阶段保留显式降级开关。

4. 风险：后端统一配置模型时，历史 JSON 文件中的脏数据无法通过校验。
   应对：先做导入预检和数据清洗报告，再决定是否自动迁移或人工修复。

5. 风险：采购页拆分过程中交互行为回退。
   应对：优先抽 composable 与展示组件，保持事件入口和模板结构逐步迁移。

## 9. 验证清单

每个阶段结束后至少执行以下检查：

1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. Source 页面合同加载与刷新后的分析结果 smoke 检查
5. Materials 页面结果展示 smoke 检查
6. 历史合同列表分页、筛选、加载 smoke 检查
7. PO 生成与采购编辑相关主流程 smoke 检查

建议补充的自动化基线：

1. 典型 ERP 合同输入样本的分析结果快照测试
2. 配置来源切换时的 repository 行为测试
3. 后端发布态配置读取接口的集成测试

## 10. 完成标准

满足以下条件后，可认为本轮重构目标达成：

1. Source 主链不再由单个 store 同时承担获取、缓存、分析和历史浏览。
2. 前端配置读取策略可以明确回答“当前值来自哪个源”。
3. 后端配置域的长期权威写入口收敛到版本化模型。
4. 采购页页面层只保留组合逻辑，局部职责已完成 feature 化拆分。
5. 所有重构阶段均未改变已确认的业务输出，除非文档明确记录并通过验收。
