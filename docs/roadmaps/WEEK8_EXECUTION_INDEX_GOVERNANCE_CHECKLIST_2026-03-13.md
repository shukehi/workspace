# 第八周执行索引与工程规范更新清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md`
> 状态：历史阶段文档。
> 目标：将前七周的重构路线沉淀为团队可执行的统一索引，并把关键结构约束升级为工程规范，避免后续新增功能再次绕开已建立的模式。

## 1. 第八周范围

本周不再聚焦某一个单独业务域，而是做两件高价值的收口工作：

1. 建立统一执行索引，让团队知道每周计划如何串联、如何落地、如何验收。
2. 把已验证有效的结构约束写入工程规范、README 和检查清单，形成长期门禁。

本周目标：

1. 产出一份面向执行的重构总索引。
2. 将关键架构决策文档化并纳入治理文档。
3. 把“模块化单体 + 按域收敛 + 契约优先 + migration 优先”的原则固定下来。
4. 把请求校验、浏览器副作用边界、兼容壳退场规则补入治理文档。
5. 为后续新需求开发建立明确放置规则和评审标准。

## 2. 第八周交付物

1. 总执行索引文档。
2. 更新后的工程规范文档。
3. 更新后的 README / docs 索引。
4. 一套适用于重构后阶段的 PR/评审检查项。
5. legacy 兼容入口清单与退场规则。
6. 如条件允许，补充简单结构守护脚本或测试。

## 3. 执行面板

```text
Week 8
- Owner: TBD
- Status: completed
- Start Date:
- Target Date:
- Exit Criteria:
  - 总执行索引与周计划导航已闭环
  - governance / README / docs 索引已完成同步
  - PR 检查项或结构守护规则已落地到可执行载体
  - 请求校验、浏览器副作用边界、legacy 兼容入口退场规则已落文档
  - 本周影响范围的测试、文档检查、必要构建验证通过
- Blocking:
- PR / Issue:
- Notes:
  - 已新增 `docs/governance/COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md`
  - 已新增 `docs/governance/FEATURE_PLACEMENT_GUIDE_2026-03-13.md`
  - 已盘点当前 compatibility shell：`server/services/OrderService.js`、`server/services/InventoryReceiptService.js`、`server/services/FormulaService.js`
  - 已在 `tests/governance-boundary-guard.test.js` 补 compatibility shell allowlist 与“单行转发” guard
  - `docs/README.md` 已加入 compatibility shell 退场清单与新功能落位指南入口
  - 已执行统一验收：`npm run type-check`、`npm run build`、`npm test`
  - 2026-03-13 smoke：核对 `docs/README.md`，确认 roadmap、governance、progress 三类入口均可直接定位本轮治理文档
  - 2026-03-13 smoke：核对 `.github/pull_request_template.md`，确认请求校验、错误结构、副作用边界、compatibility shell 退场计划等检查项已写入 PR 模板
  - 2026-03-13 smoke：核对 `docs/governance/FEATURE_PLACEMENT_GUIDE_2026-03-13.md` 与 `docs/governance/COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md`，确认落位规则和 compatibility shell 名单与当前代码一致
  - 2026-03-13 smoke：执行 `node --test tests/governance-boundary-guard.test.js` 通过；当前 compatibility shell 实际文件内容仍是单行转发：`OrderService.js`、`InventoryReceiptService.js`、`FormulaService.js`
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. 重构共识已从 roadmap 升级为可执行规范，而不只是描述性文档。
2. README、docs 索引、governance 文档之间没有互相脱节的规则表述。
3. 请求校验、浏览器副作用、兼容壳退场规则已进入治理文本，而不是只停留在本轮分析结论中。
4. 至少一项结构守护规则真正接入 PR 模板、检查清单、lint 或脚本。
5. 新成员可以从文档入口快速理解“新代码应该放哪里、怎么验收、如何避免结构回退”。

## 5. 任务拆解

### 任务 1：建立总执行索引

目标：把当前分散的周计划组织成一条清晰的执行路线。

建议新增文件：

1. `docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md`

建议内容：

- [ ] 重构总目标
- [ ] 阶段顺序与依赖关系
- [ ] 每周计划摘要
- [ ] 每周输入/输出/验收标准
- [ ] 推荐执行顺序与暂停点
- [ ] 风险最高阶段提示

建议结构：

1. 总览
2. 周计划导航
3. 已完成 / 进行中 / 待开始 状态位
4. 关键决策摘要

验收：

1. 新加入成员只看一份索引就能理解整个重构路线。

### 任务 2：更新 docs 总目录导航

目标：让新的重构文档在 `docs/README.md` 中可被快速找到。

建议处理文件：

1. `docs/README.md`

建议动作：

- [x] 在 `roadmaps` 区域加入本轮重构总蓝图、任务拆解、周计划索引
- [x] 按“总方案 -> 任务拆解 -> 周计划”顺序排列
- [x] 保持现有文档分层风格一致

验收：

1. 文档入口清晰，避免周计划散落而难以查找。

### 任务 3：将关键结构约束写入工程规范

目标：把“本轮重构形成的共识”从 roadmap 升级为 governance。

建议处理文件：

1. `docs/governance/ENGINEERING_CONVENTIONS.md`
2. `docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
3. `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`

建议新增/补充主题：

- [ ] 新功能默认按领域 feature/module 落位
- [ ] 页面层只保留装配，不堆业务规则
- [ ] route/controller/service/repository 的职责边界
- [ ] 前后端契约优先，避免临时兼容 shape 扩散
- [ ] schema 变更优先使用 migration
- [ ] 共享规则必须优先单一来源，不允许双端复制实现

验收：

1. 后续需求评审有明确的结构标准可依赖。

### 任务 4：更新 README 中的架构说明

目标：让 README 反映最新的工程方向，而不仅是当前技术栈说明。

建议处理文件：

1. `README.md`

建议补充内容：

- [ ] 当前推荐的前端 feature 化方向
- [ ] 当前推荐的后端模块化方向
- [ ] 契约统一原则
- [ ] migration 使用原则
- [ ] 运行数据 / 配置数据 / 工作流数据边界摘要

验收：

1. README 既能给新成员看，也能给实施者看。

### 任务 5：建立重构后 PR 检查清单

目标：把执行经验沉淀到日常评审流程，防止后续回潮。

建议处理文件：

1. `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`
2. 如需新增，可创建 `docs/governance/REFACTOR_REVIEW_CHECKLIST_2026-03-13.md`

建议检查项：

- [ ] 新增代码是否按域放置
- [ ] 是否引入新的超大页面/超大 service
- [ ] 是否重复实现已有共享规则
- [ ] 是否引入新的临时 API shape
- [ ] schema 变更是否通过 migration
- [ ] 测试是否覆盖拆分后的纯函数/策略层

验收：

1. 评审标准可以提前阻止结构倒退。

### 任务 6：建立简单结构守护规则

目标：将部分结构约束转成自动检查，而不是只靠人工记忆。

建议处理文件：

1. `tests/repository-structure-guard.test.js`
2. 如有需要，新增一个轻量守护测试

建议可加的守护方向：

- [ ] 阻止新运行产物被跟踪
- [ ] 阻止新的根目录杂项文件出现
- [ ] 视情况阻止新增某些已废弃目录用法

注意：

- [ ] 结构守护要保守，不要一口气加过多易误报规则

验收：

1. 守护规则能帮团队维持当前治理成果。

### 任务 7：形成“新功能落位指南”

目标：减少团队成员在新增功能时的路径选择成本。

建议新增或补充内容：

1. 在 `docs/governance/ENGINEERING_CONVENTIONS.md` 增加“新增文件放置规则”
2. 或新增 `docs/governance/FEATURE_PLACEMENT_GUIDE_2026-03-13.md`

建议内容：

- [x] 新页面逻辑放哪
- [x] 新共享类型放哪
- [x] 新 controller/service/repository 放哪
- [x] 新配置规则放哪
- [x] 什么情况下可进入 shared

验收：

1. 新增需求时不再频繁讨论“文件应该放哪”。

### 任务 8：同步阶段状态与完成标准

目标：让总计划具备状态管理，而不是一组静态方案文档。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. 总索引文档

建议动作：

- [ ] 为每周计划标记状态
- [ ] 标记哪些已启动、哪些待执行
- [ ] 标记关键阻塞点或前置依赖

验收：

1. 团队可以直接用文档跟踪执行进展。

### 任务 9：产出阶段性总结

目标：把前七周计划的整体价值讲清楚，方便沟通与对齐资源。

建议新增文件：

1. `docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md`

建议内容：

- [ ] 为什么先改订单，再改 inventory，再改 mappings/formulas
- [ ] 当前最关键收益点
- [ ] 还未做的高风险项
- [ ] 后续可按资源情况裁剪哪些阶段

验收：

1. 管理层和实施者都能快速理解投入产出。

## 4. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1、任务 2
2. 再做任务 3、任务 4、任务 5
3. 然后做任务 6、任务 7
4. 最后做任务 8、任务 9

## 5. 推荐 PR / 提交切分

### 提交 1：索引与导航

建议范围：

1. `docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md`
2. `docs/README.md`

建议标题：

`docs(refactor): add execution index and roadmap navigation`

### 提交 2：工程规范更新

建议范围：

1. `docs/governance/ENGINEERING_CONVENTIONS.md`
2. `docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
3. `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`
4. 如有新增 placement guide，也包含在内

建议标题：

`docs(governance): codify refactor architecture conventions`

### 提交 3：守护与阶段总结

建议范围：

1. `tests/repository-structure-guard.test.js`
2. `docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md`
3. 任务状态更新文件

建议标题：

`docs(chore): add refactor governance checks and program summary`

## 6. 第八周验收清单

- [x] 总执行索引可直接指导团队推进
- [x] docs 导航已更新
- [x] 工程规范已反映本轮结构决策
- [x] PR 检查项可用于日常评审
- [x] 结构守护规则至少覆盖关键倒退风险
- [x] `git status --short` 仅包含预期文档/守护改动

本轮已记录的 smoke：

1. Docs entry points
   - `docs/README.md` 中可直接定位 governance、roadmaps、progress 三类入口
   - 本轮关键入口已可搜索到：总索引、总蓝图、任务拆解、compatibility shell 清单、feature placement guide、阶段总结
2. PR template / governance consistency
   - `.github/pull_request_template.md` 已包含：
     - request validation impact
     - browser/runtime side-effect boundary
     - legacy / compatibility retirement plan
     - affected write APIs validation / error shape check
3. Compatibility shell consistency
   - 文档登记名单与代码一致：
     - `server/services/OrderService.js`
     - `server/services/InventoryReceiptService.js`
     - `server/services/FormulaService.js`
   - 三个顶层壳文件当前仍保持单行转发
4. Guard
   - `node --test tests/governance-boundary-guard.test.js` 通过
   - 说明 governance 文本与结构守护当前没有脱节

## 7. 第八周不做的事

第八周明确不做：

1. 不同时开启新的大规模业务域重构
2. 不在同一周继续推进 TypeScript 全量迁移
3. 不将结构守护规则设计得过于激进
4. 不把治理文档写成脱离当前仓库现状的理想方案

这样可以保证第八周的重点是“固化成果、降低回退概率、提升团队执行效率”。

## 8. 后续建议

如果第八周完成顺利，后续可以按资源选择：

1. 开始后端渐进式 TypeScript 迁移试点
2. 扩大 migration 覆盖范围并逐步清理更多启动时 schema patch
3. 持续把新增需求纳入新的 feature/module 结构，而不是再回流到旧目录
