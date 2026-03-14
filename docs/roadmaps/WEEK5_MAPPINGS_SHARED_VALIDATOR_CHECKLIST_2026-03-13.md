# 第五周 Mappings 与共享校验层收敛清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md`
> 状态：in_progress
> 目标：收敛 mappings 域前后端重复的 adapter/validator 逻辑，建立共享规则实现来源，降低配置规则演进时的双端维护成本。

## 1. 第五周范围

本周聚焦 mappings 域与共享校验层，不同时推进 formulas 和 migration 的大改造。

本周目标：

1. 识别前后端 mapping adapter/validator 的重复与差异。
2. 建立共享规则核心层，作为前后端唯一实现来源。
3. 保持前端即时校验体验与后端最终校验能力不变。
4. 为后续 formulas/material catalog 等配置域复用共享校验模式打基础。

## 2. 第五周交付物

1. 一份 mappings 共享规则职责划分说明。
2. 一套共享的 adapter/validator 核心实现。
3. 前端与后端对共享实现的接入层。
4. 覆盖关键场景的共享基线测试。

## 3. 执行面板

```text
Week 5
- Owner: TBD
- Status: in_progress
- Start Date:
- Target Date:
- Exit Criteria:
  - mappings 共享规则核心层已建立并成为唯一规则来源
  - 前后端 facade 已接入共享实现
  - issue path / normalize / adapter 基线 diff 已核对
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
  - shared adapter core 已落地到 `shared/mappings/mapping-adapter-core.js`
  - shared validator core 已落地到 `shared/mappings/mapping-validator-core.js`
  - 当前共享范围为 packaging / cylinder / lock / lock-fork，handle 仍保留在前后端 facade
  - 已通过 `tests/shared-mapping-core.test.js`、`tests/mappings/mapping-parity.test.ts`、`tests/mapping-server-validator.test.js`、`tests/mapping-adapter-baseline.test.ts`、`tests/config-routes.test.js` 与 `npm run type-check`
  - 已执行统一验收：`npm run build`、`npm test`
  - 新旧 mapping 结果 diff / smoke 记录仍待补齐，因此本周继续保留 `in_progress`
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. 共享层只承载纯规则，不混入浏览器、Express、数据库等运行时依赖。
2. issue 结构、字段命名、默认值策略在前后端保持一致。
3. 不允许形成“共享核心 + 前端一套特化规则 + 后端一套特化规则”的隐性三份实现。
4. 至少记录一份新旧 validator / adapter 结果 diff。

## 5. 风险控制模板

```text
Risk:
- 前后端 issue path、字段名、错误层级可能不兼容
- 共享层抽取不当可能把环境差异混进核心规则

Mitigation:
- 先盘点重复与差异，再抽共享核心，环境差异全部留在 facade
- 对高频 mappings 样例执行新旧结果 diff
- 共享层只保留纯函数，避免直接依赖前后端运行时

Rollback:
- 回滚入口：保留旧前端 validator / adapter facade 与旧后端实现引用
- 回滚条件：issue path 破坏兼容、前端即时校验体验异常、后端最终校验结果偏移
- 回滚后验证步骤：重跑 mappings 基线测试并比对旧实现输出
```

## 6. 重点关注对象

### 3.1 前端

1. `src/services/mappings/mappingValidator.ts`
2. `src/services/mappings/mappingAdapter.ts`
3. `src/features/config-editor/composables/useMappingConfigEditor.ts`
4. `src/services/mappingConfigApi.ts`
5. `src/types/mapping.ts`

### 3.2 后端

1. `server/services/mappings/mapping.validator.js`
2. `server/services/mappings/mapping.adapter.js`
3. `server/services/mappings/mapping.workflow.js`
4. `server/routes/mappingsConfig.js`
5. `server/routes/mappingProfile.routeFactory.js`

### 3.3 测试

1. `tests/mapping-validator.test.ts`
2. `tests/mapping-server-validator.test.js`
3. `tests/mapping-adapter-baseline.test.ts`
4. `tests/config-routes.test.js`

## 7. 推荐目标结构

建议先引入一个共享规则核心层，再由前后端各自保留轻量包装层。

推荐结构：

```text
shared/
└── mappings/
    ├── adapter/
    │   ├── packaging.js|ts
    │   ├── lock.js|ts
    │   ├── cylinder.js|ts
    │   ├── lock-fork.js|ts
    │   └── handle.js|ts
    ├── validator/
    │   ├── packaging.js|ts
    │   ├── lock.js|ts
    │   ├── cylinder.js|ts
    │   ├── lock-fork.js|ts
    │   └── handle.js|ts
    ├── common/
    │   ├── normalize.js|ts
    │   ├── issue.js|ts
    │   └── record.js|ts
    └── index.js|ts
```

说明：

1. 第五周的重点是“共享核心”，不是一次性统一所有文件扩展名。
2. 如果当前仓库更适合先用 JS，可先用 JS 落地共享层，再逐步补类型声明。
3. 前后端各自保留 facade 层，用于兼容现有 import 路径与环境差异。

## 8. 共享层设计原则

1. 共享层只承载纯函数与纯规则，不依赖浏览器或 Express/Sequelize 环境。
2. 前端包装层负责 UI 友好接入和类型提示。
3. 后端包装层负责 workflow、持久化、HTTP 错误映射。
4. issue 结构、normalize 规则、adapter 默认值应只保留一份核心实现。

## 9. 任务拆解

### 任务 1：前后端 mapping 规则差异盘点

目标：在合并前明确哪些逻辑完全重复，哪些逻辑存在环境差异。

建议处理文件：

1. `src/services/mappings/mappingValidator.ts`
2. `server/services/mappings/mapping.validator.js`
3. `src/services/mappings/mappingAdapter.ts`
4. `server/services/mappings/mapping.adapter.js`

建议动作：

- [x] 逐类对比 packaging 规则
- [x] 逐类对比 lock 规则
- [x] 逐类对比 cylinder 规则
- [x] 逐类对比 lock-fork 规则
- [x] 逐类对比 handle 规则
- [x] 标记完全相同逻辑
- [x] 标记仅命名差异逻辑
- [x] 标记确实需要环境隔离的逻辑

交付物：

1. 一份“可共享 / 需包装 / 暂不共享”分类表

验收：

1. 开始编码前已经知道共享边界，避免共享层设计反复推翻。

### 任务 2：抽取共享公共工具

目标：先抽最基础的纯工具，降低后续 validator 合并难度。

建议新增文件：

1. `shared/mappings/common/record.ts|js`
2. `shared/mappings/common/normalize.ts|js`
3. `shared/mappings/common/issue.ts|js`

建议迁移内容：

- [ ] `asRecord`
- [ ] `toTrimmedString`
- [ ] `isPlainObject`
- [ ] `quotePathSegment`
- [ ] `createIssue`
- [x] 各类 normalize key 工具

验收：

1. 前后端 validator/adapter 不再重复定义同类底层工具。

### 任务 3：抽取共享 adapter 核心层

目标：把当前双端 adapter 的核心数据标准化逻辑统一起来。

建议新增文件：

1. `shared/mappings/adapter/packaging.ts|js`
2. `shared/mappings/adapter/lock.ts|js`
3. `shared/mappings/adapter/cylinder.ts|js`
4. `shared/mappings/adapter/lock-fork.ts|js`
5. `shared/mappings/adapter/handle.ts|js`

建议动作：

- [x] 先合并 packaging adapter
- [ ] 再合并 lock / handle adapter
- [x] 再合并 cylinder / lock-fork adapter
- [x] 保持当前默认值和 canonicalization 规则不变

验收：

1. adapter 规则核心实现只保留一份。
2. baseline 测试结果不变。

### 任务 4：抽取共享 validator 核心层

目标：把 issue 路径、结构校验、normalize 冲突检查统一到单一来源。

建议新增文件：

1. `shared/mappings/validator/packaging.ts|js`
2. `shared/mappings/validator/lock.ts|js`
3. `shared/mappings/validator/cylinder.ts|js`
4. `shared/mappings/validator/lock-fork.ts|js`
5. `shared/mappings/validator/handle.ts|js`

建议动作：

- [x] 先合并 packaging validator
- [x] 再合并 lock validator
- [ ] 再合并 handle validator
- [x] 最后合并 cylinder / lock-fork validator

建议注意：

- [x] issue path 要完全保持兼容
- [x] 嵌套校验路径和 code 不要轻易改变
- [x] 前端表单高亮与后端 workflow 错误返回必须继续匹配

验收：

1. validator 核心实现只保留一份。
2. 前后端 issue 结构一致。

### 任务 5：建立前端 facade 接入层

目标：不大改前端调用方路径的前提下，切换到共享核心实现。

建议保留并改造文件：

1. `src/services/mappings/mappingValidator.ts`
2. `src/services/mappings/mappingAdapter.ts`

建议动作：

- [x] 将其改为共享层的轻量转发或包装
- [x] 保留当前导出名称不变
- [x] 确保 `useMappingConfigEditor` 等调用方无需大改

验收：

1. 前端调用层几乎无感切换。
2. UI 校验行为不变。

### 任务 6：建立后端 facade 接入层

目标：让 workflow 和 routeFactory 保持稳定，但底层规则转向共享实现。

建议保留并改造文件：

1. `server/services/mappings/mapping.validator.js`
2. `server/services/mappings/mapping.adapter.js`

建议动作：

- [x] 将后端文件改为共享层包装器
- [x] 保留当前 workflow 所依赖的方法名
- [x] 保证 `mapping.workflow.js`、`mappingsConfig.js` 不需要同时大改

验收：

1. 后端 workflow 行为不变。
2. 共享规则替换对 route 层透明。

### 任务 7：统一 issue / schemaVersion / profileCode 契约边界

目标：明确“共享层做什么，不做什么”。

建议动作：

- [ ] issue 结构统一由共享层产出
- [ ] `schemaVersion`、`profileCode` 等 workflow 语义保留在后端 workflow 层
- [ ] 不把数据库、审计日志、revision 语义塞进共享层

验收：

1. 共享层保持纯规则，不被 workflow 细节污染。

### 任务 8：补共享层基线测试

目标：让共享层本身成为稳定契约，而不是只靠前后端各自测试兜底。

建议新增测试：

1. `tests/shared-mapping-adapter.test.ts|js`
2. `tests/shared-mapping-validator.test.ts|js`

建议覆盖：

- [ ] packaging legacy dictionary 兼容
- [ ] lock normalize 冲突
- [ ] handle 默认值与必填项
- [ ] cylinder nested path
- [ ] lock-fork high-height rules
- [ ] issue path/code 兼容性

验收：

1. 共享层规则有独立基线测试保护。

### 任务 9：回归前后端现有测试

目标：确保共享层替换不会破坏现有行为。

重点测试文件：

1. `tests/mapping-validator.test.ts`
2. `tests/mapping-server-validator.test.js`
3. `tests/mapping-adapter-baseline.test.ts`
4. `tests/config-routes.test.js`

关键回归点：

- [x] 前端 path-based issues 保持一致
- [x] 后端 workflow 校验结果保持一致
- [x] 当前基线映射配置仍能 clean validate
- [x] 配置保存/发布流程不回归

### 任务 10：文档同步与推广模板沉淀

目标：把“共享校验层”的模式文档化，便于复制到 formulas 等域。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. `docs/progress/` 下新增 mappings 收敛阶段说明（如需要）

建议记录：

- [ ] 共享层目录结构
- [ ] facade 层职责
- [ ] 哪些规则适合共享，哪些不适合共享

## 7. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1、任务 2
2. 再做任务 3、任务 4
3. 然后做任务 5、任务 6、任务 7
4. 最后做任务 8、任务 9、任务 10

## 8. 推荐 PR 切分

### PR 1：共享公共工具与 adapter 核心层

建议范围：

1. `shared/mappings/common/*`
2. `shared/mappings/adapter/*`
3. 相关基线测试

建议标题：

`refactor(mappings): extract shared adapter core`

### PR 2：共享 validator 核心层

建议范围：

1. `shared/mappings/validator/*`
2. 相关共享测试

建议标题：

`refactor(mappings): extract shared validator core`

### PR 3：前后端 facade 接入

建议范围：

1. `src/services/mappings/*`
2. `server/services/mappings/*`
3. 必要的 workflow/config editor 调整
4. 回归测试

建议标题：

`refactor(mappings): route frontend and backend through shared rule layer`

## 9. 第五周验收清单

- [x] `npm test`
- [x] mapping 前端测试通过
- [x] mapping 后端测试通过
- [x] config routes 测试通过
- [x] 前后端 mapping 规则核心实现已对 packaging / cylinder / lock / lock-fork 收敛到共享层
- [x] issue path/code 与现状兼容
- [ ] `git status --short` 仅包含预期改动

当前已完成的首批落地：

1. 已新增 `shared/mappings/mapping-adapter-core.js`，作为 packaging / cylinder / lock / lock-fork 的共享 adapter 规则来源。
2. 已新增 `shared/mappings/mapping-validator-core.js`，作为 packaging / cylinder / lock / lock-fork 的共享 validator 规则来源。
3. `src/services/mappings/mappingAdapter.ts` 与 `server/services/mappings/mapping.adapter.js` 已切到共享 adapter core。
4. `src/services/mappings/mappingValidator.ts` 与 `server/services/mappings/mapping.validator.js` 已切到共享 validator core。
5. `handle` 相关 adapter / validator 仍保留在前后端 facade 中，作为当前已识别的环境差异保留项。
6. 已通过 `tests/shared-mapping-core.test.js`、`tests/mappings/mapping-parity.test.ts`、`tests/mapping-server-validator.test.js`、`tests/mapping-adapter-baseline.test.ts`、`tests/config-routes.test.js` 和 `npm run type-check`。

## 10. 第五周不做的事

第五周明确不做：

1. 不同时重构 formulas 规则体系
2. 不在本周推进数据库 migration 框架
3. 不同时把整个后端切到 TypeScript
4. 不顺带修改 mapping workflow 的业务语义

这样可以保证第五周只解决一个高价值问题：消除 mappings 域前后端双份规则实现。

## 11. 第六周衔接建议

如果第五周完成顺利，第六周建议优先选择以下其一：

1. 推进 formulas 域的 editor/workflow/schema 收敛
2. 开始 database migration 机制规范化与 `ensure*Columns()` 退场计划
