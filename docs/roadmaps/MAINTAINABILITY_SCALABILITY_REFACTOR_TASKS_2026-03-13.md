# 可维护性与可扩展性重构任务附录（2026-03-13）

> 对应主文档：`docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> 对应索引：`docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md`
> 状态：active
> 用途：作为 Week 1-8 执行体系的任务拆解附录，补充“每周要拆什么、先后顺序如何、建议如何分批提交”。

## 1. 使用方式

这份文档不单独维护 `Owner / Status / Blocking / PR / Issue`，避免和执行索引、周清单形成平行控制面板。

建议按下面方式配合使用：

1. 总目标、阶段顺序、风险提示，以 `REFACTOR_EXECUTION_INDEX` 为准。
2. 每周状态、退出标准、回滚方案，以对应 `WEEK*.md` 清单为准。
3. 本文档只负责给出任务拆解、推荐拆分顺序和建议 PR 粒度。

## 2. 通用原则

1. 先统一契约和边界，再做深层逻辑搬迁。
2. 每个子任务尽量保持可独立提交，避免超大 PR。
3. 除明确说明外，结构治理阶段不顺带调整业务规则。
4. 浏览器副作用不再继续下沉到核心 store / manager；只能收敛到页面、UI 协调层或明确的 runtime adapter。
5. 写接口改造默认要补请求校验落点，不再新增裸 `req.body` / `req.query` 透传。
6. compatibility shell 可以临时保留，但只能转发，且必须有退场计划。

## 3. Week 1：契约与 Procurement 前端样板

对应周清单：`docs/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md`

目标：统一跨端契约落点，并完成 Procurement 前端最低风险拆分样板。

### 3.1 契约收敛

- [ ] 盘点订单、库存、配方、映射、打印接口当前成功返回形态
- [ ] 盘点错误返回形态，统一到 `code/message/details` 语义
- [x] 明确分页结构与列表 DTO 约定
- [x] 抽取共享状态枚举、常见错误码、基础 DTO / schema
- [x] 评估 `src/lib/api.ts` 中现有兼容 normalize 分支，并显式抽出兼容 helper

### 3.2 Procurement 页面拆分

- [ ] 梳理 `src/views/Procurement.vue` 当前职责边界
- [x] 抽出 route query 同步逻辑
- [ ] 抽出筛选状态初始化与重置逻辑
- [x] 抽出 normalize / summary / facet 纯函数
- [ ] 保持页面只负责装配，不继续堆入批量动作、导出细节或入库流程细节

### 3.3 本周额外约束

- [ ] 不在本周直接重写 `OrderService` 主流程
- [ ] 不新增新的 API payload 形态
- [ ] 不把下载、打印、`window.confirm`、`window.open` 继续推到 store / helper 深层

当前已完成的首批落地：

1. 已新增 `src/shared/*` 和 `server/shared/*` 首批共享契约落点。
2. 已新增 `src/features/procurement/composables/useProcurementRouteQuery.ts`。
3. 已新增 `src/features/procurement/model/orderNormalizer.ts` 与 `orderSummary.ts`。
4. 已将 `src/stores/useProcurementStore.ts` 接到新的 normalize / summary 纯函数。
5. 已将 `src/lib/api.ts` 的 envelope/raw payload 兼容逻辑显式化为 helper。
6. 已补共享契约、API 兼容层、Procurement route/state/summary 的定向测试。

当前仍保留的兼容点：

1. `GET /api/contracts` 继续保留顶层 `rows/total` 形态，未切到统一 `{ success, data }` envelope。
2. `src/lib/api.ts` 仍兼容 raw payload 与 envelope payload 双形态，待后续接口统一后再收敛。

建议 PR 拆分：

1. `refactor(contract): add shared response and error conventions`
2. `refactor(procurement): extract route query and filter state`
3. `refactor(procurement): move normalize and summary helpers`

## 4. Week 2：OrderService 模块化拆分

对应周清单：`docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md`

目标：把 `server/services/OrderService.js` 从单文件复杂中心拆成可单测、可定位的后端模块。

### 4.1 边界识别

- [x] 梳理查询、命令、状态策略、防重、入库、序列化职责
- [ ] 明确各子模块输入输出，先冻结对外 service 入口
- [x] 先整理主流程最小回归路径：创建、更新、删除、入库、去重

### 4.2 子模块拆分

- [x] 抽出 policy：状态枚举、合法流转、arrived/completed 可编辑规则
- [x] 抽出 dedupe：payload 构造、dedupe key、自动单/手动单判定
- [x] 抽出 mapper：order item / order 序列化、日志 normalize
- [ ] 抽出 stock-in：入库数量校验、receipt item 校验、库存联动
- [x] 抽出 repository：查询、创建、更新、删除、transaction 边界

### 4.3 本周额外约束

- [x] 采用渐进抽离方式，先拆规则和数据访问，再保留主 service 编排不变
- [ ] 不在同一个 PR 里同时改 service 接口和 route 契约
- [x] 保留旧入口适配层，便于高风险回滚

当前已完成的首批落地：

1. 已新增 `server/services/orders/order.policy.js`，承载状态流转与编辑锁规则。
2. 已新增 `server/services/orders/order.errors.js`，承载订单域错误定义，并复用 policy 错误类型。
3. 已新增 `server/services/orders/order.query-policy.js`，承载筛选、summary、facets 规则。
4. 已新增 `server/services/orders/order.mapper.js`，承载序列化、日志 normalize 和 ordered quantity 回退。
5. 已新增 `server/services/orders/order.dedupe.js`，承载 source contract / metadata / dedupe key 逻辑。
6. 已新增 `server/services/orders/order.repository.js`，承载 Order / OrderItem / OrderIdempotencyKey 访问。
7. 已新增 `server/services/orders/order.stockin.js`，承载入库状态校验、receipt 包装、数量同步和完成态计算。
8. 已新增 `server/services/orders/order.service.js` 与 `server/services/orders/index.js` 作为新服务入口。
9. `server/services/OrderService.js` 已降级为兼容壳，继续保持既有引用可用。
10. 已反复执行 `tests/order-service.test.js`、`tests/order-routes.test.js` 与 `tests/inventory-route.test.js`，当前回归稳定。

当前仍待完成：

1. 仍未完成的是 Week 3 范围内的 controller / middleware / request validation 收口，而不是继续深拆服务内部模块。

建议 PR 拆分：

1. `refactor(order): extract status policy and errors`
2. `refactor(order): extract dedupe and mapper helpers`
3. `refactor(order): extract stock-in and repository boundaries`

## 5. Week 3：Controller / Error / Validation 收口

对应周清单：`docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md`

目标：建立统一 `route -> controller -> service` 链路，并为写接口补稳定的请求校验入口。

### 5.1 错误抽象与 middleware

- [x] 定义 `AppError` 或等价错误结构
- [x] 抽取统一 `errorCodes`
- [x] 引入 `asyncHandler` 或等价包装，减少 route 中的重复 `try/catch`
- [x] 为订单域建立统一错误出口，并兼容现有主要错误响应形态

### 5.2 Controller 与校验边界

- [x] 将 `server/routes/order.js` 的 HTTP 处理下沉到 controller
- [x] 为高风险写接口补首批请求校验落点（当前为 controller 层轻量校验）
- [ ] 明确 request parsing、validation、controller、service 的责任顺序
- [ ] 保留必要的上下文日志，至少记录模块名、动作名、关键主键、错误码

当前已完成的首批落地：

1. 已新增 `server/app/errors/errorCodes.js`、`AppError.js`、`normalizeError.js`。
2. 已新增 `server/app/middleware/asyncHandler.js`、`errorHandler.js`、`notFound.js`、`validateRequest.js`。
3. 已新增 `server/app/http/response.js`。
4. 已新增 `server/controllers/order.controller.js`。
5. 已新增 `server/validators/order.validators.js`，订单域写接口和 `GET /api/orders` query 已接入首批字段级 request validation middleware。
6. `server/routes/order.js` 已改为薄路由，只负责 URL 绑定。
7. 订单域错误当前已由统一 `errorHandler` 输出，保持主要成功/失败 JSON 兼容。
8. 已执行 `tests/order-routes.test.js`、`tests/order-service.test.js` 与 `tests/inventory-route.test.js`。

### 5.3 本周额外约束

- [ ] 先采样现有成功/失败响应样例，再做接线改造
- [ ] 不一次性替换所有 route；优先从订单域切入
- [ ] 如果旧客户端还依赖旧字段，先兼容再收敛

建议 PR 拆分：

1. `refactor(http): add app error and error middleware`
2. `refactor(order): introduce order controller and async handler`
3. `refactor(http): add request validation boundary for write routes`

## 6. Week 4：Inventory 域复制模式

对应周清单：`docs/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md`

目标：复制订单域的拆分模式，但优先解决 inventory 的真实热点，而不是机械套模板。

### 6.1 真实热点收敛

- [x] 优先梳理 `src/views/Inventory.vue` 的路由、分页、撤销、筛选编排（首批已落到 receipts route composable）
- [ ] 优先梳理 `server/services/InventoryReceiptService.js` 的规则边界和数据访问边界
- [ ] 评估 `useInventoryStore.ts`，仅在职责确实过重时再继续拆分

### 6.2 结构复制

- [x] 先在 `inventoryReceipts` 路由复制 `controller -> service -> validation` 的 HTTP 层模式
- [x] 将页面收敛为装配层，避免继续加重 store（已下沉 receipts route/filter/pagination 编排）
- [ ] 把与下载、打印或浏览器 API 直接相关的行为挡在 UI 边界

当前已完成的首批落地：

1. 已新增 `server/controllers/inventory-receipt.controller.js`。
2. 已新增 `server/validators/inventory-receipt.validators.js`。
3. `server/routes/inventoryReceipts.js` 已切到 `asyncHandler + controller + errorHandler + validateRequest`。
4. inventory receipt 相关错误已接入 `normalizeError`，与订单域错误出口保持一致。
5. 已新增 `src/features/inventory/composables/useInventoryReceiptRouteState.ts`，将 `Inventory.vue` 中 receipts 的 route/filter/pagination 状态下沉。
6. 已新增 `src/features/inventory/composables/useInventoryReceiptFlow.ts`，将 `Inventory.vue` 中 receipts 的撤销弹窗与轨迹审计状态下沉。
7. `src/views/Inventory.vue` 已改为消费 receipt route / flow composable，页面层不再直接维护对应 watchers 和弹窗状态细节。
8. 已新增 `server/services/inventory/inventory-receipt.{errors,mapper,policy,query-policy,repository,service}.js` 与 `server/services/inventory/index.js`，`server/services/InventoryReceiptService.js` 已降为兼容入口壳。
9. 已新增 `server/controllers/inventory.controller.js` 与 `server/validators/inventory.validators.js`，`server/routes/inventory.js` 已切到 `controller + validateRequest + errorHandler`。
10. 已新增 `server/services/inventory/inventory.{mapper,repository,service}.js`，`inventory.controller.js` 已降为薄控制器。
11. 已补 inventory receipt 的 params/body 校验回归、Inventory 结构 guard 与 composable 行为测试，并通过 `tests/inventory-route.test.js`、`tests/order-service.test.js`、`tests/inventory-view-guard.test.js`、`tests/inventory-receipt-route-state.test.ts`、`tests/inventory-receipt-flow.test.ts` 以及 `npm run type-check`。

### 6.3 本周额外约束

- [ ] 不把 inventory 域问题简单归因为“大 store”
- [ ] 优先守住入库、反向回退、列表分页的回归行为
- [ ] 拆分后要能清楚描述 receipt 校验和库存联动的边界

建议 PR 拆分：

1. `refactor(inventory): isolate inventory page orchestration`
2. `refactor(inventory): extract receipt validation and service rules`
3. `refactor(inventory): align controller and service boundaries`

## 7. Week 5：Mappings 共享规则层

对应周清单：`docs/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md`

目标：结束前后端双份 adapter / validator 核心规则的长期并行维护。

### 7.1 差异盘点

- [ ] 对比前后端 mapping adapter 差异
- [ ] 对比前后端 mapping validator 差异
- [ ] 标记必须保留的运行时差异：前端 UI 友好提示、后端最终兜底

### 7.2 共享核心提取

- [x] 设计共享目录与导出方式
- [ ] 合并包装、锁具、锁芯、锁叉、拉手等核心规则
- [x] 保留前端 facade 与后端 facade，环境差异不进入核心层

### 7.3 回归补强

- [x] 为共享 adapter / validator 增加基线测试
- [ ] 覆盖 normalize 冲突、嵌套路径、默认值、结构错误等关键场景
- [x] 替换期内对比新旧校验结果，至少保留一次 diff 记录

### 7.4 本周额外约束

- [ ] 不把 issue path、字段别名或错误层级兼容性忽略掉
- [ ] 核心共享层只承载规则，不承载浏览器或后端运行时细节
- [ ] 如有兼容 facade，必须写明退场条件

当前已完成的首批落地：

1. 已新增 `shared/mappings/mapping-adapter-core.js`，统一 packaging / cylinder / lock / lock-fork 的 adapter 规则。
2. 已新增 `shared/mappings/mapping-validator-core.js`，统一 packaging / cylinder / lock / lock-fork 的 validator 规则。
3. 前端 `src/services/mappings/mappingAdapter.ts` 与 `mappingValidator.ts` 已改为共享层 facade。
4. 后端 `server/services/mappings/mapping.adapter.js` 与 `mapping.validator.js` 已改为共享层 facade。
5. `handle` 仍保留在前后端 facade 中，暂不并入共享核心，避免把尚未完全一致的行为强行合并。
6. 已通过 `tests/shared-mapping-core.test.js`、`tests/mappings/mapping-parity.test.ts`、`tests/mapping-server-validator.test.js`、`tests/mapping-adapter-baseline.test.ts`、`tests/config-routes.test.js` 与 `npm run type-check`。

建议 PR 拆分：

1. `refactor(mapping): extract shared adapter core`
2. `refactor(mapping): extract shared validator core`
3. `test(mapping): lock shared rule parity baselines`

## 8. Week 6：Formula Manager 收敛 + Migration 基线

对应周清单：`docs/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md`

目标：优先解决 formulas 前端工作流堆叠，并把数据库演进纳入正式 migration。

### 8.1 Formula Manager 收敛

- [ ] 将 `useFormulaManager.ts` 拆成 list/detail、draft、dirty guard、BOM 编辑、本地校验、publish/archive/rollback/delete 等子能力
- [ ] 保持 `ColorFormula.vue` 继续作为装配层，而不是把页面重新做大
- [ ] 统一 formulas 前后端入口、错误结构和控制器风格

当前已完成的首批落地：

1. 已新增 `src/features/formulas/model/formulaDraft.ts`。
2. 已新增 `src/features/formulas/composables/useFormulaList.ts`，承载列表/分页加载、local draft prepend 和首项选中回退。
3. 已新增 `src/features/formulas/composables/useFormulaDetail.ts`，承载 detail/revision 远端读取与 local draft detail 应用。
4. `useFormulaManager.ts` 中的 BOM normalize、本地校验、server error 映射、local draft key 规则已下沉到 model 层。
5. `useFormulaManager.ts` 中的列表/分页加载与 detail/revision 读取已分别下沉到 list/detail composable。
6. 已新增 `tests/formula-draft-model.test.ts`、`tests/formula-list-composable.test.ts` 与 `tests/formula-detail-composable.test.ts` 锁定这些纯逻辑和装配行为。
7. 已通过 `npm run type-check`、`tests/formula-draft-model.test.ts`、`tests/formula-list-composable.test.ts`、`tests/formula-detail-composable.test.ts`、`tests/config-routes.test.js`、`tests/formula-workflow.test.js`、`tests/formula-validator.test.js`。

### 8.2 浏览器副作用边界

- [ ] 将 `window.confirm`、`window.prompt`、`window.onbeforeunload` 等行为收敛到 UI 协调层或 runtime adapter
- [ ] 不继续在领域 manager 内新增浏览器 API 细节
- [ ] 如果需要保留过渡实现，明确允许文件和后续迁出路径

### 8.3 Migration 基线

- [ ] 建立 `server/db/migrations/`
- [ ] 选定迁移执行方式、命名规则和测试环境初始化方式
- [ ] 盘点 `server/models/index.js` 中哪些 `ensure*Columns()` 可迁入 migration
- [ ] 首批 migration 只做基线和最小必要修正，不混入大规模领域改表

### 8.4 本周额外约束

- [ ] formulas 后端已有 `workflow/repository` 基础分层，不要误按“从零重构”推进
- [ ] 至少验证全新库初始化、已有库升级、测试环境重建三条路径
- [ ] 本周结束时要明确 migration 与旧初始化补丁的边界

建议 PR 拆分：

1. `refactor(formulas): split formula manager responsibilities`
2. `refactor(formulas): align controller and contract boundaries`
3. `chore(db): introduce migration baseline`

## 9. Week 7：Materials / Source Analysis Runtime

对应周清单：`docs/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md`

目标：明确 materials、material catalog、source-analysis 的边界，优先打断 source runtime 的全局依赖链。

### 9.1 Source runtime 边界

- [ ] 明确 `configRepository` 的配置来源职责
- [ ] 明确 `configLoader` 的装载与缓存职责
- [ ] 明确 `sourceAnalysisConfig` 的只读配置组装职责
- [ ] 让 `useSourceStore` 只保留合同载入、分析触发、页面状态协调

### 9.2 Materials / catalog 边界

- [ ] 区分 materials 数据源、material catalog 工作流和 source-analysis 配置消费
- [ ] 清理“来源分析配置”和“材料目录配置”语义混用
- [ ] 如果仍保留兼容入口，明确它只是过渡路径

### 9.3 本周额外约束

- [ ] 不把问题重新表述为“页面太大”；核心是 runtime 依赖链和配置来源不清
- [ ] 不在 store 中继续扩散 `localStorage`、全局 runtime 或隐式缓存逻辑
- [ ] 拆分后必须能解释“当前配置从哪里来、何时刷新、谁负责缓存”

建议 PR 拆分：

1. `refactor(source): isolate runtime repository loader boundaries`
2. `refactor(source): simplify source store orchestration`
3. `refactor(materials): clarify catalog and source-analysis boundaries`

## 10. Week 8：治理固化与退场清理

对应周清单：`docs/roadmaps/WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md`

目标：把前七周已经验证过的结构模式和风险控制方式固化成长期门禁。

### 10.1 文档与模板固化

- [ ] 同步更新 governance 文档、PR 模板、README 入口
- [ ] 确认索引、主蓝图、周清单、任务附录之间的链接关系清晰
- [ ] 将新增的边界规则写成可复用 checklist，而不是散落在周总结里

### 10.2 自动守护

- [ ] 为结构边界补 guard test 或等价自动检查
- [ ] 对浏览器副作用 allowlist、legacy route 使用、兼容入口退场条件建立最小保护
- [ ] 如果新增请求校验规范，补对应 guard 或 route 测试

### 10.3 兼容壳与 legacy 路径盘点

- [ ] 盘点 compatibility shell 文件和 legacy 路径
- [ ] 标记哪些可立即删除，哪些必须继续保留
- [ ] 对继续保留的兼容层写清退场条件和最晚处理阶段

建议 PR 拆分：

1. `docs(governance): codify boundary and validation rules`
2. `test(guard): add structure and governance guard coverage`
3. `chore(legacy): document retirement paths for compatibility shells`

## 11. 跨周验证基线

每周除对应周清单外，至少补下面这些验证：

- [ ] `npm run type-check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] 对当周影响主链路做 smoke 检查
- [ ] 更新文档状态与执行记录
- [ ] 检查 `git status --short`

建议额外关注：

1. 结构是否真正变简单，而不是只把代码搬到更多文件。
2. 契约是否真正收敛，而不是前端继续增加兼容分支。
3. 浏览器副作用是否停止扩散。
4. compatibility shell 是否只转发、不承载新语义。
5. 高风险周是否有明确回滚入口和回滚后验证动作。

## 12. 推荐开工顺序

建议按执行索引保持统一顺序，不再使用旧版 `A-H` 作为单独推进路线：

1. Week 1：契约 + Procurement 样板
2. Week 2：OrderService 拆分
3. Week 3：controller / error / validation 收口
4. Week 4：inventory 域复制模式
5. Week 5：mappings 共享规则层
6. Week 6：formula manager + migration
7. Week 7：materials / source-analysis runtime
8. Week 8：治理固化与退场清理

如果某周未完成，不直接在本文档顺延；应先在对应周清单的 `Notes / Blocking / Exit Criteria` 中记录遗留范围，再决定是否拆到下一周。
