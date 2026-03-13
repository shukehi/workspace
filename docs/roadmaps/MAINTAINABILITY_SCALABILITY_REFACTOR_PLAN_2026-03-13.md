# 可维护性与可扩展性重构蓝图（2026-03-13）

> 状态：proposal
> 目标：在不改变现有业务结果的前提下，逐步降低项目复杂度，提升维护效率、需求扩展速度和多人协作稳定性。

## 1. 背景

当前项目已经具备较完整的业务能力、测试基线和文档治理基础，但随着采购、库存、配方、映射等模块继续演进，代码层面已经出现以下典型信号：

1. 前端同时存在 `views/stores/services/lib` 与 `features/*` 两套组织方式，模块边界不完全稳定。
2. 若干页面、store、service 文件体量偏大，业务编排、状态管理、数据转换和规则校验耦合在同一文件中。
3. 前后端部分领域规则存在重复实现，增加了变更不同步的风险。
4. API 返回结构、错误结构和领域 DTO 尚未完全收敛，前端存在兼容式消费逻辑。
5. 数据库结构演进仍部分依赖启动时补列，长期不利于部署一致性和回滚管理。

本蓝图用于指导下一阶段的结构性治理，重点解决“边界、契约、重复、演进方式”四类问题。

## 2. 目标

### 2.1 核心目标

1. 建立清晰的模块边界，让新增需求优先落在单一 feature/module 内完成。
2. 收敛前后端契约，降低接口变更和重构带来的联动风险。
3. 拆解超大文件，分离页面装配、业务编排、规则策略、数据映射和持久化访问。
4. 为后续业务增长保留空间，但继续保持“模块化单体”架构，不提前过度拆分系统。

### 2.2 非目标

本轮不包含以下事项：

1. 不重写现有业务流程，不主动变更采购、库存、配方、打印等业务规则。
2. 不进行整站视觉改版，不重构 CSS 体系。
3. 不立即拆分微服务，不引入分布式架构。
4. 不要求一次性将全量后端代码迁移到 TypeScript。

## 3. 当前主要问题

### P0

1. 前端目录分层与 feature 化混用，存在职责分散、归属不明的问题。
2. 订单/采购链路存在超大文件，修改成本高，回归影响面大。
3. 映射适配与校验逻辑前后端重复实现，维护成本偏高。
4. API 返回与错误结构不完全统一，前端需要对多种 payload 形态做兼容。

### P1

1. 后端核心逻辑仍以 JavaScript 为主，跨端类型契约不够强。
2. 路由层承担较多错误分支处理，缺少统一异常抽象与 middleware 收口。
3. 数据库 schema 演进未完全迁移到正式 migration 机制。
4. 请求入参校验未统一收口，多个 route 仍直接消费裸 `req.body` / `req.query`。
5. 前端部分 store/composable 混入 `localStorage`、下载、`window.confirm` / `window.prompt` 等浏览器副作用，削弱可测性。

### P2

1. 路由注册、模块导出、共享常量仍有进一步聚合空间。
2. 配置类数据、运行时数据、数据库访问边界仍可继续抽象。
3. 旧入口兼容壳文件与 legacy 路径存在长期残留风险，需要在治理后期明确退场。
4. 不同领域测试密度并不均衡，实际重构顺序应考虑“谁有更强回归保护”。

### 3.1 基于当前代码现状的校准

为避免后续治理偏离真实热点，需要补充以下判断：

1. `Procurement.vue`、`useProcurementStore.ts`、`OrderService.js`、`server/routes/order.js` 仍是当前最明显的复杂度中心。
2. inventory 域的主要热点更偏向 `src/views/Inventory.vue` 与 `server/services/InventoryReceiptService.js`，`useInventoryStore.ts` 问题存在但不是第一矛盾。
3. formulas 域后端已经具备 `workflow/repository/validator/mapper` 基础分层，当前更需要优先收敛的是 `src/features/formulas/composables/useFormulaManager.ts` 与 HTTP 契约风格。
4. materials / source-analysis 域的核心问题不是页面体积，而是 `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 的全局运行时依赖链。
5. `ColorFormula.vue`、`Materials.vue` 当前更接近装配层，不应被误判为和 `Procurement.vue` 同级别的超大页面问题。

## 4. 总体策略

建议继续采用“模块化单体 + 明确领域边界”的演进方式，而不是直接拆微服务。

原则如下：

1. 先收敛边界，再优化实现。
2. 先统一契约，再做大规模结构迁移。
3. 先以订单/采购域做样板，再复制到库存、配方、映射等模块。
4. 先做低风险搬迁和包装，再做逻辑拆分与能力下沉。

## 5. 目标结构

### 5.1 前端目标结构

```text
src/
├── app/                    # 应用级入口、router、bootstrap、providers
├── shared/                 # 全局共享能力：api、types、schemas、constants、utils、ui
├── features/
│   ├── procurement/        # 采购域
│   │   ├── api/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── model/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── pages/
│   ├── inventory/
│   ├── formulas/
│   ├── mappings/
│   └── source-analysis/
└── assets/
```

约束：

1. `views/` 逐步收敛为页面装配层，复杂业务逻辑迁入对应 feature。
2. `stores/` 仅保留跨页面状态和领域状态容器，不继续承担大量数据转换职责。
3. 公共能力优先进入 `shared/`，避免“临时工具函数”散落在多个目录。

### 5.2 后端目标结构

```text
server/
├── app/                    # 中间件、错误处理、HTTP 装配
├── shared/                 # 常量、通用工具、共享契约
├── modules/
│   ├── orders/
│   │   ├── order.routes.js
│   │   ├── order.controller.js
│   │   ├── order.service.js
│   │   ├── order.repository.js
│   │   ├── order.policy.js
│   │   ├── order.mapper.js
│   │   └── order.schema.js
│   ├── inventory/
│   ├── materials/
│   ├── mappings/
│   └── formulas/
├── db/
│   ├── models/
│   └── migrations/
└── index.js
```

约束：

1. route/controller 只处理 HTTP 输入输出与状态码，不直接承载核心业务规则。
2. service 负责应用编排，policy 负责规则约束，repository 负责数据访问。
3. schema 变更通过 migration 落地，不继续扩大启动时补列策略的覆盖范围。

## 6. 重点改造对象

### 6.1 前端第一批

1. `src/views/Procurement.vue`
2. `src/views/Inventory.vue`
3. `src/stores/useProcurementStore.ts`
4. `src/features/formulas/composables/useFormulaManager.ts`
5. `src/stores/useSourceStore.ts`
6. `src/services/sourceAnalysisConfig.ts`
7. `src/services/configLoader.ts`
8. `src/lib/api.ts`

### 6.2 后端第一批

1. `server/services/OrderService.js`
2. `server/routes/order.js`
3. `server/models/index.js`
4. `server/services/InventoryReceiptService.js`

说明：

1. `src/views/ColorFormula.vue` 与 `src/views/Materials.vue` 当前更像装配层，优先级低于其背后的 manager / runtime 链路。
2. `server/services/formulas/*` 与 `server/services/materials/*` 已有一定模块化基础，后续治理重点应放在继续统一契约、错误风格与入口边界，而不是假设这些域仍是纯单文件实现。

### 6.3 重复逻辑治理第一批

1. `src/services/mappings/mappingValidator.ts`
2. `server/services/mappings/mapping.validator.js`
3. `src/services/mappings/mappingAdapter.ts`
4. `server/services/mappings/mapping.adapter.js`

## 7. 分阶段实施

## 阶段 A：契约收敛（P0）

目标：先统一跨端沟通语言，降低后续拆分风险。

任务：

1. 收敛 API 成功返回结构，避免新旧接口继续混用多种 payload 形态。
2. 收敛错误返回结构，统一 `code/message/details` 语义。
3. 统一分页 DTO、列表响应 DTO、状态枚举、常见错误码。
4. 为订单、库存、映射、配方建立共享 DTO 与 schema 定义。
5. 为关键写接口补请求 schema 或等价参数校验边界，不再默认直接消费裸请求对象。

验收：

1. 前端 API 层不再持续增加 payload 兼容分支。
2. 新增接口默认遵循统一响应格式。
3. 关键领域对象具备可复用的共享类型或 schema。
4. 高风险写接口具备明确的请求校验落点。

## 阶段 B：订单/采购域样板重构（P0）

目标：把最复杂、最容易继续膨胀的链路先收敛成标准模式。

任务：

1. 将 `src/views/Procurement.vue` 收敛为页面装配层。
2. 拆分采购页面逻辑为独立 composable，例如路由同步、筛选状态、批量操作、打印导出、入库流程。
3. 将 `src/stores/useProcurementStore.ts` 中的 normalize、summary、facet、payload 处理下沉到 feature 内部 model/api 层。
4. 将 `server/services/OrderService.js` 拆为 service/repository/policy/mapper/dedupe/stock-in 等子模块。
5. 将 `server/routes/order.js` 简化为 controller + 统一错误分发。
6. 将 CSV 下载、打印确认、浏览器交互等副作用限制在页面或 feature UI 边界，不继续堆入 store。

验收：

1. 页面和接口行为保持不变。
2. 订单/采购相关测试继续通过。
3. 原有超大文件显著缩小，核心规则具备独立文件承载。

## 阶段 C：重复规则治理（P0）

目标：消除前后端双份规则实现，降低维护成本。

任务：

1. 收敛 mapping adapter/validator 为单一实现来源。
2. 明确前端校验与后端校验的职责分工：前端即时提示，后端最终兜底。
3. 如条件允许，提取根级 `shared/` 或等价共享契约层。

验收：

1. 映射规则变更只需维护一份核心实现。
2. 前后端校验结果在关键场景下保持一致。

## 阶段 D：异常处理与基础设施整理（P1）

目标：降低后端模块数量增加后的维护噪音。

任务：

1. 引入统一 `AppError` 或等价异常抽象。
2. 用统一错误处理中间件代替 route 内部大量重复 `try/catch + res.status` 模板。
3. 统一日志上下文，至少覆盖模块名、操作名、关键主键、错误码。
4. 为 route/controller 增加统一请求校验入口或校验 middleware。

验收：

1. route 层重复错误处理模板显著减少。
2. 错误输出结构一致，便于前端识别和测试断言。
3. 新增 controller 默认具备稳定的请求校验入口。

## 阶段 E：数据库迁移规范化（P1）

目标：将 schema 演进从“运行时补丁”迁移到“可审计变更”。

任务：

1. 建立 `server/db/migrations/`。
2. 新增字段、索引、表结构调整优先通过 migration 管理。
3. 启动流程中的 `ensure*Columns()` 仅保留过渡期兜底，并逐步收缩。
4. 补齐迁移执行、测试初始化、README 使用说明。

验收：

1. 新增 schema 变更有明确 migration 文件。
2. 不再继续扩大启动时补列逻辑。

## 阶段 F：推广到 inventory / formulas / mappings（P1）

目标：把样板域的结构模式推广到其他核心领域。

任务：

1. inventory 复用模块边界拆分方式，但优先聚焦 `Inventory.vue` 的路由/分页/撤销流程编排和 `InventoryReceiptService.js` 的规则拆分。
2. formulas 前端优先收敛 `useFormulaManager.ts`；后端在现有 `workflow/repository` 基础上继续统一 controller、契约和错误输出风格。
3. materials / source-analysis 优先拆解 `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 的全局运行时依赖，明确 runtime / repository / loader 边界。
4. 路由注册按模块聚合，减少中心化入口负担。

验收：

1. 新增领域功能时，改动范围主要落在单个 feature/module 内。
2. 新成员能够按目录直接理解职责归属。
3. 已经模块化过的域不再因为兼容路径长期残留而回退成“双入口常态”。

## 8. 建议的具体拆分方式

### 8.1 Procurement 页面

建议拆分为：

1. `useProcurementRouteQuery`
2. `useProcurementFilters`
3. `useProcurementActions`
4. `useProcurementPrint`
5. `useProcurementStockInFlow`

页面本身只负责：

1. 组合 UI 组件。
2. 连接 store/composable 输出。
3. 处理少量页面生命周期。

### 8.2 Procurement Store

建议下沉以下职责：

1. order payload normalize
2. summary/facet 计算
3. query 参数转换
4. 错误对象识别与 DTO 适配

目标是让 store 更像“状态协调器”，而不是“领域逻辑容器”。

### 8.3 OrderService

建议拆分为：

1. `order.service`：应用服务编排
2. `order.repository`：查询与持久化
3. `order.policy`：状态流转、字段可编辑性
4. `order.dedupe`：幂等与防重
5. `order.stockin`：入库处理
6. `order.mapper`：响应 DTO 序列化

### 8.4 Formula Manager

建议优先拆分以下职责：

1. list / detail 拉取
2. local draft 管理
3. dirty guard 与离开确认
4. BOM 编辑与本地校验
5. publish / archive / rollback / delete 动作

目标是让 `useFormulaManager.ts` 回到“编排多个子能力”的位置，而不是继续承载全部前端工作流细节。

### 8.5 Source Analysis Runtime

建议优先拆分以下边界：

1. `configRepository`：定义配置读取来源
2. `configLoader`：装载与缓存策略
3. `sourceAnalysisConfig`：为分析函数组装只读配置
4. `useSourceStore`：只负责合同载入、分析触发、页面状态协调

目标是避免分析逻辑继续依赖全局单例 runtime，并让“当前配置来自哪里”具备可解释性。

## 9. 技术策略建议

### 9.1 关于 TypeScript

后端建议采用“渐进迁移”策略：

1. 优先迁移 routes、controllers、services、contracts。
2. repository 和 models 可延后处理。
3. 不强制一次性完成全仓迁移。

### 9.2 关于数据库

当前阶段继续保留 SQLite 是合理的，但需要先把 repository、transaction、migration 规范建立好。后续如果迁移到 PostgreSQL，应以“替换底层存储实现”为目标，而不是重新设计业务层。

### 9.3 关于共享层

建议中期建立共享契约层，承载以下内容：

1. 状态枚举
2. 分页 DTO
3. 领域对象 schema
4. 错误码
5. 公共 validator/adapter

### 9.4 关于浏览器副作用

建议逐步把以下能力从 store / 领域 manager 中抽离到 UI 或 runtime adapter：

1. `window.confirm` / `window.prompt` / `window.open`
2. `localStorage`
3. 文件下载与 `document.createElement('a')`
4. `window.onbeforeunload`

原则是：领域状态可以触发意图，但不直接持有浏览器 API 细节。

### 9.5 关于重构顺序与测试密度

建议把“测试保护强度”纳入排序：

1. 订单域和 mappings 域已有较强回归保护，适合优先做深拆。
2. source-analysis 与 formulas 前端状态层的专门测试相对薄弱，宜先补边界与最小保护，再做深层拆分。
3. 高风险域优先做可回归的样板改造，低测试密度域优先做边界澄清和副作用隔离。

### 9.6 关于兼容壳与 legacy 路径

临时兼容壳可以接受，但必须满足：

1. 仅作为过渡入口存在，不新增新逻辑。
2. 周计划或治理文档中写清退场条件。
3. 第 8 周必须盘点并清理仍然保留的 legacy 入口。

## 10. 风险与应对

1. 风险：结构调整过程中影响现有业务行为。
   应对：先搬迁后拆逻辑，每一步都依赖现有测试兜底。

2. 风险：重构只做了目录变化，未真正降低复杂度。
   应对：每次拆分都要求职责重新分配，而不是单纯移动文件。

3. 风险：共享层设计过重，反而拖慢演进。
   应对：优先抽“契约”和“重复规则”，避免提前抽象所有工具能力。

4. 风险：阶段跨度过大，中途失去推进节奏。
   应对：以订单/采购域作为样板，分批提交，按阶段验收。

## 11. 验证清单

每个阶段完成后至少执行：

1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. 订单、采购、库存、打印主流程 smoke 检查
5. `git status --short`

## 12. 完成标准

满足以下条件后，可认为本轮可维护性/可扩展性治理达到阶段目标：

1. 新增一个采购规则或配置类型时，主要改动落在单一 feature/module 内。
2. 订单/采购链路不再依赖单个超大页面或超大 service 承担核心复杂度。
3. 前后端对关键领域对象、错误码和分页结构拥有统一契约。
4. 重复规则实现显著减少。
5. schema 演进具备可追踪、可回滚的 migration 机制。
6. 高风险接口具备统一请求校验与错误输出入口。
7. 浏览器副作用不再散落在核心 store / manager 中。

## 13. 建议的近期执行顺序

建议按以下顺序推进：

1. 先做阶段 A，统一契约。
2. 再做阶段 B，完成订单/采购样板重构。
3. 随后做阶段 C，治理 mapping 重复规则。
4. 接着做阶段 D 和阶段 E，补齐基础设施。
5. 最后推进阶段 F，将模式复制到其他核心域。
