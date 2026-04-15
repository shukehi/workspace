# 重构执行总索引（2026-03-13）

> 状态：阶段计划，部分已落地。
> 当前实际结果请优先查看 `docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md` 与各 `WEEK*.md` 文档顶部状态说明。

## 1. 总目标

本轮重构的核心目标不是重写业务，而是在不改变当前业务结果的前提下，逐步完成以下治理：

1. 收敛前后端模块边界。
2. 统一关键领域契约与错误结构。
3. 拆解超大页面、超大 store、超大 service。
4. 消除双端重复规则实现。
5. 建立可持续的数据库 migration 规范。
6. 将已验证的模式固化为工程规范与守护规则。

## 2. 执行原则

1. 先契约，后拆分。
2. 先样板域，后复制。
3. 先低风险搬迁与包装，后做深层收敛。
4. 每周聚焦一个主问题，不并行推进过多高风险主题。
5. 每阶段都必须有测试、文档和验收标准。

## 3. 文档导航

### 3.1 总方案

1. `docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
2. `docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`（按 Week 1-8 对齐的任务拆解附录）

### 3.2 周计划

1. `docs/archive/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md`
2. `docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md`
3. `docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md`
4. `docs/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md`
5. `docs/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md`
6. `docs/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md`
7. `docs/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md`
8. `docs/roadmaps/WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md`

### 3.3 阶段总结

1. `docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md`

## 4. 推荐执行顺序

建议严格按以下顺序推进：

1. 第 1 周：契约落点 + Procurement 前端低风险拆分
2. 第 2 周：订单后端 service 模块化拆分
3. 第 3 周：controller 化 + 统一错误处理中间件
4. 第 4 周：将订单域模式复制到 inventory 域
5. 第 5 周：mappings 共享规则层收敛
6. 第 6 周：formulas 域收敛 + migration 基线建立
7. 第 7 周：materials / source-analysis 域边界收敛
8. 第 8 周：总索引、治理文档、守护规则固化

## 5. 每周摘要

### 第 1 周：契约与前端样板

- 目标：统一共享契约落点，拆出 Procurement 页面与 store 中最容易独立的纯逻辑。
- 输出：共享类型/常量落点、route query composable、normalize/summary 纯函数。
- 重点收益：为后续订单域重构提供低风险样板。

### 第 2 周：订单后端拆分

- 目标：将 `OrderService` 从单文件复杂中心拆为 policy/dedupe/mapper/stock-in/repository/service。
- 输出：订单域后端模块化基础结构。
- 重点收益：后端核心复杂度开始可控。

### 第 3 周：HTTP 层收口

- 目标：建立 `route -> controller -> service` 链路，并引入统一错误/请求校验中间件。
- 输出：`AppError`、`errorCodes`、`asyncHandler`、请求校验落点、`order.controller`。
- 重点收益：错误响应风格统一，route 文件显著瘦身。

### 第 4 周：Inventory 域复制模式

- 目标：把订单域已验证的拆分模式复制到 inventory 域，但优先收敛 `Inventory.vue` 与 `InventoryReceiptService`。
- 输出：inventory 页面装配收敛、receipt service 规则边界、controller/service 边界收敛。
- 重点收益：形成第二个稳定样板域。

### 第 5 周：Mappings 共享规则层

- 目标：消除前后端双份 mapping adapter/validator 实现。
- 输出：共享规则核心层 + 前后端 facade 包装层。
- 重点收益：降低配置规则变更时的双端维护成本。

### 第 6 周：Formulas + Migration

- 目标：优先收敛 `useFormulaManager` 前端工作流边界，并建立 migration 正式基线。
- 输出：formula manager 拆分结果、formulas 契约/入口收敛结果、`server/db/migrations/`、首批 migration。
- 重点收益：数据库演进开始从启动补丁转向正式迁移。

### 第 7 周：Materials / Source Analysis

- 目标：明确 materials、material catalog、source-analysis 三者边界，优先拆解 `useSourceStore -> loadSourceAnalysisConfig -> configLoader` 链路。
- 输出：source-analysis runtime 链路收敛、config runtime/repository/loader 职责重划、后端 materials 边界整理。
- 重点收益：来源解析和材料数据语义不再混淆。

### 第 8 周：索引与治理固化

- 目标：把前七周形成的模式升级为长期工程规范和门禁。
- 输出：总索引、governance 更新、PR 检查项、结构守护规则。
- 重点收益：降低结构倒退风险，提升团队协作一致性。

## 6. 阶段依赖关系

以下依赖关系建议保持：

1. 第 2 周依赖第 1 周的契约落点与样板思路。
2. 第 3 周依赖第 2 周完成订单域 service 拆分。
3. 第 4 周依赖第 3 周的 controller / error middleware 模式稳定。
4. 第 5 周可在第 3 周后启动，但更建议在第 4 周后推进，以便团队已熟悉模块化模式。
5. 第 6 周 migration 基线可独立推进，但 formulas 收敛建议在 mappings 共享层稳定后执行。
6. 第 7 周更适合作为前六周之后的边界整理阶段。
7. 第 8 周应放在一轮主要结构治理完成后执行。

## 7. 状态看板模板

建议后续按下面模板维护状态：

```text
Week N
- Owner:
- Status: pending | in_progress | completed | blocked
- Start Date:
- Target Date:
- Exit Criteria:
- Blocking:
- PR / Issue:
- Notes:
```

当前建议初始状态：

1. Week 1 - Owner: TBD | Status: pending | Exit Criteria: 契约落点合并，Procurement 样板拆分完成
2. Week 2 - Owner: TBD | Status: pending | Exit Criteria: `OrderService` 模块拆分完成并通过主流程回归
3. Week 3 - Owner: TBD | Status: pending | Exit Criteria: controller + error middleware 接线完成且响应结构受控
4. Week 4 - Owner: TBD | Status: pending | Exit Criteria: inventory 域完成模式复制并稳定
5. Week 5 - Owner: TBD | Status: pending | Exit Criteria: mappings 共享规则层替换完成且前后端一致
6. Week 6 - Owner: TBD | Status: pending | Exit Criteria: formulas 边界收敛完成，migration 基线建立
7. Week 7 - Owner: TBD | Status: pending | Exit Criteria: materials / source-analysis 边界重新划清
8. Week 8 - Owner: TBD | Status: pending | Exit Criteria: 治理文档、PR 检查项、守护规则落地

建议在 `docs/README.md` 或周清单文档中同步一份表格化状态面板，最少包含以下列：

1. Week
2. Owner
3. Status
4. Start Date
5. Target Date
6. Exit Criteria
7. Blocking
8. PR / Issue

状态更新规则建议统一为：

1. 只有在 Exit Criteria 全部满足后才能标记为 `completed`。
2. 存在外部依赖、环境问题、回归失败时标记为 `blocked`，并写清 Blocking。
3. 每次状态变更都要同步 PR / Issue 链接，避免口头追踪。
4. 跨周未完成项不得直接顺延，必须在 Notes 中说明遗留范围和风险。

## 7.1 当前状态快照

基于当前分支实现和周清单记录，当前状态更接近下面这个快照：

1. Week 1 - Status: completed | 共享契约落点与 Procurement 样板拆分已完成，自动化验收和页面 smoke 已补齐
2. Week 2 - Status: completed | 订单服务模块化拆分已完成，主链路与 duplicate/idempotency smoke 已补齐
3. Week 3 - Status: completed | 订单域 controller / error / validation 管线已完成，成功/校验/not-found 响应样例与 server/index / SPA fallback 验证已补齐
4. Week 4 - Status: completed | inventory 域模式复制已完成，inventory / receipt / reverse 主链路 smoke 已补齐
5. Week 5 - Status: completed | mappings 共享规则核心已完成，前后端真实配置 diff / smoke 已补齐
6. Week 6 - Status: completed | formulas manager 收敛与 migration 基线已完成，页面与空库/旧库 smoke 已补齐
7. Week 7 - Status: completed | source-analysis / materials 边界收敛已完成，页面入口与 workflow/runtime 证据已补齐
8. Week 8 - Status: completed | compatibility shell 清单、guard、落位指南与 docs 入口治理已完成，治理 smoke 已补齐

当前 Week 1-8 已全部达到本轮定义的退出标准：统一通过 `npm run type-check`、`npm test`、`npm run build`，且各周影响域 smoke / 使用记录已补齐。

## 8. 每周统一验收标准

除周计划中特定验收项外，每周默认至少执行：

1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. 对当周影响域执行 smoke 检查
5. 检查 `git status --short`
6. 同步相关文档状态

此外，建议所有周计划统一补充以下“退出标准”检查：

1. 受影响主链路至少有一份明确的回归清单，并记录结果。
2. 对外契约未发生非预期变更；若有变更，必须附契约 diff 或迁移说明。
3. 新旧实现切换点明确，不允许存在长期双写但无下线计划的过渡逻辑。
4. 拆分后的模块职责边界可描述，且新增目录结构已在文档中落点。
5. 风险周必须存在回滚方案，至少写清回滚入口、回滚条件、回滚后验证动作。
6. 如果涉及数据库、缓存、配置或异步任务，必须检查初始化和测试环境是否仍可重建。

建议按周类型补充结构性指标，而不是只看命令是否通过：

1. 第 1-4 周：关注超大页面 / store / service 是否实质缩小，核心逻辑是否从 UI / route 中抽离。
2. 第 2-5 周：关注 controller、service、shared rule 层的输入输出是否稳定，避免只“挪文件不减耦合”。
3. 第 6 周：关注 migration 是否支持从干净环境初始化，并能在测试环境重复执行。
4. 第 7-8 周：关注治理规则是否真正接入 PR 模板、lint 规则或目录守护，而不是停留在文档描述。

## 9. 高风险阶段提示

风险最高的阶段主要有：

1. 第 2 周：`OrderService` 拆分，容易影响订单主流程。
2. 第 3 周：错误处理中间件接线，容易影响 API 返回结构。
3. 第 5 周：共享 validator 替换，容易影响前后端 issue path 兼容性。
4. 第 6 周：migration 基线建立，容易影响本地与测试环境初始化。

这些阶段建议：

1. 控制 PR 粒度。
2. 严格跑回归测试。
3. 每阶段结束后做一次行为校验和文档同步。

建议进一步把高风险阶段的缓释动作固定下来：

### 9.1 第 2 周：`OrderService` 拆分

1. 拆分前先冻结现有主流程行为，整理创建、更新、入库、去重等最小回归路径。
2. 采用“抽纯函数 / 抽 repository / 抽 policy”渐进方式，不要一次性改写整个 service。
3. 每个子模块迁出后先保持旧接口不变，再做内部收敛，避免接口和实现同时变化。
4. 回滚方案：保留拆分前的 service 入口适配层，出现主流程回归时可快速回退到旧编排。

### 9.2 第 3 周：错误处理中间件接线

1. 上线前先采样现有关键 API 的成功/失败响应样例，作为 diff 基线。
2. 统一 `AppError` 和 `errorCodes` 时，先兼容旧响应字段，再逐步收敛调用方。
3. route 接线改造应按域逐步切换，避免一次替换所有入口。
4. 回滚方案：保留旧错误包装逻辑的旁路开关，发现响应结构破坏时按域回退。

### 9.3 第 5 周：共享 validator 替换

1. 在替换前固化前后端共同样例，覆盖 issue path、字段名、错误层级和边界输入。
2. 共享核心层只承载规则，不承载运行时环境差异；前后端差异必须留在 facade。
3. 替换期内对比新旧校验结果，至少对高频配置样例做一次 diff。
4. 回滚方案：保留旧 validator facade，若 issue path 兼容性被破坏，可局部切回旧实现。

### 9.4 第 6 周：migration 基线建立

1. 基线建立前先盘点当前 schema 来源，区分启动补丁、手工 SQL、测试夹具和真实运行态。
2. 首批 migration 只做基线和最小必要修正，不在同一周混入大规模领域改表。
3. 至少验证三类路径：全新库初始化、已有库升级、测试环境重建。
4. 回滚方案：保留基线前初始化方式和 schema 快照，出现升级失败时可恢复到旧初始化路径。

建议所有高风险周统一套用下面模板补充到对应周清单：

```text
Risk:
- 可能影响的主链路
- 最可能失稳的契约 / 数据 / UI 行为

Mitigation:
- 拆分顺序
- 保护性测试
- 灰度或分批切换方式

Rollback:
- 回滚入口
- 回滚条件
- 回滚后验证步骤
```

## 10. 可以裁剪的执行方案

如果资源有限，可采用缩减版本：

### 10.1 最小落地版

1. 第 1 周
2. 第 2 周
3. 第 3 周
4. 第 8 周

适用场景：只想先稳住订单链路和基础工程规范。

### 10.2 中等投入版

1. 第 1 周
2. 第 2 周
3. 第 3 周
4. 第 4 周
5. 第 5 周
6. 第 8 周

适用场景：希望同时稳定订单、库存、mapping 规则三条高价值链路。

### 10.3 完整治理版

执行全部 8 周计划。

适用场景：希望系统性完成结构治理，并建立长期演进基础。

## 11. 建议的角色分工

如果多人协作，建议按以下方式分工：

1. 一人负责前端域收敛与页面层拆分。
2. 一人负责后端 service/controller/error middleware 拆分。
3. 一人负责共享契约、mappings 共享规则层与 migration 规范。
4. 一人负责测试回归、文档更新和治理规则固化。

为避免责任悬空，建议每周明确一个直接 owner：

1. Week 1、4、7 默认以前端 owner 为主。
2. Week 2、3 默认以后端 owner 为主。
3. Week 5、6 默认以共享契约 / 数据 owner 为主。
4. Week 8 默认以治理 owner 为主，但需所有 owner 共同验收。

## 12. 下一步建议

如果现在开始正式执行，建议先从下面两步开始：

1. 以 `docs/archive/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md` 为第一落地清单启动改造。
2. 同时把本索引加入 `docs/README.md`，作为后续所有重构 PR 的统一引用入口。
