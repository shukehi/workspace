# 第一周重构执行清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> 状态：todo
> 目标：把第一周的重构工作进一步细化到文件级，确保可以直接开工。

## 1. 第一周范围

本周只做低风险、可验证、能为后续重构铺路的工作，不直接大改订单主流程。

本周目标：

1. 统一契约方案并建立共享定义落点。
2. 拆出 Procurement 页面中的路由同步与筛选逻辑。
3. 抽出 Procurement 的 normalize/summary 纯函数。
4. 保持现有页面行为、接口行为和测试结果不变。

## 2. 本周交付物

1. 一套共享的响应/错误/分页/状态常量定义。
2. Procurement 页面的 composable 初步拆分。
3. Procurement Store 的纯函数下沉结果。
4. 补充或调整后的回归测试。

## 3. 执行面板

```text
Week 1
- Owner: TBD
- Status: pending
- Start Date:
- Target Date:
- Exit Criteria:
  - 共享契约落点已建立并在前后端都有首批接入点
  - Procurement 路由同步逻辑已从页面层抽离
  - Procurement normalize / summary 纯函数已下沉
  - 本周影响范围的回归测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. 关键共享定义的落点已经固定，后续新增契约不再继续散落。
2. Procurement 页面层只保留装配职责，不再直接承载可抽离的 query 同步与纯计算逻辑。
3. 若存在临时兼容类型或常量，必须在文档或注释中标记后续下线点。
4. 至少记录一份 Procurement 主链路 smoke 检查结果。

## 5. 任务拆解

### 任务 1：统一契约落点与命名

目标：先把“共享定义放哪儿”定下来，不急着一次性改完所有接口。

建议新增文件：

1. `src/shared/constants/order.ts`
2. `src/shared/constants/api.ts`
3. `src/shared/types/api.ts`
4. `src/shared/types/pagination.ts`
5. `server/shared/contracts/api.js`
6. `server/shared/contracts/pagination.js`
7. `server/shared/constants/order.js`

建议内容：

- `src/shared/constants/order.ts`
  - [ ] 抽取订单状态列表
  - [ ] 抽取 pending 状态集合

- `src/shared/constants/api.ts`
  - [ ] 抽取常见错误码常量
  - [ ] 抽取通用成功/失败标识约定

- `src/shared/types/api.ts`
  - [ ] 定义统一成功返回类型
  - [ ] 定义统一错误返回类型
  - [ ] 定义校验错误类型

- `src/shared/types/pagination.ts`
  - [ ] 定义分页请求参数类型
  - [ ] 定义分页响应类型

- `server/shared/contracts/api.js`
  - [ ] 定义后端错误码常量导出
  - [ ] 定义统一错误响应构造函数

- `server/shared/contracts/pagination.js`
  - [ ] 定义统一分页响应构造函数

- `server/shared/constants/order.js`
  - [ ] 抽取状态枚举与 pending 集合

验收：

1. 前后端都有明确共享定义落点。
2. 后续重构不再新增散落常量。

### 任务 2：盘点并标记首批契约接入点

目标：不一次性重写所有接口，先标出本周最关键接入点。

建议处理文件：

1. `src/lib/api.ts`
2. `src/types/order.ts`
3. `src/stores/useProcurementStore.ts`
4. `server/routes/order.js`
5. `server/routes/api.js`

文件级动作：

- `src/lib/api.ts`
  - [ ] 标记当前兼容逻辑哪些是临时保留
  - [ ] 预留统一响应类型接入点

- `src/types/order.ts`
  - [ ] 检查 `ProcurementOrderListResponse` 是否可迁入共享分页类型
  - [ ] 标记与共享常量重复的状态定义

- `src/stores/useProcurementStore.ts`
  - [ ] 标记当前使用的分页结构与错误结构
  - [ ] 为后续下沉做注释或拆分准备

- `server/routes/order.js`
  - [ ] 标记当前错误输出形态
  - [ ] 标记哪些错误码后续应统一

- `server/routes/api.js`
  - [ ] 标记哪些接口可优先切到统一返回风格

验收：

1. 关键接入点清晰。
2. 不会在本周改造时误伤非核心接口。

### 任务 3：拆 Procurement 路由同步逻辑

目标：把页面中的 query 同步职责抽出来。

建议新增文件：

1. `src/features/procurement/composables/useProcurementRouteQuery.ts`

主要迁移来源：

1. `src/views/Procurement.vue`

建议迁移内容：

- [ ] `syncSearchQueryFromRoute`
- [ ] `syncProcurementFiltersFromRoute`
- [ ] `updateProcurementRouteQuery`
- [ ] `buildProcurementQuery`
- [ ] `procurementPage`
- [ ] `procurementPageSize`

页面保留内容：

- [ ] composable 调用
- [ ] 少量 watch/onMounted 连接逻辑

验收：

1. URL 查询参数行为与现状一致。
2. 页面体积明显减小。

### 任务 4：拆 Procurement 筛选状态逻辑

目标：把筛选与汇总卡片交互从页面层进一步下沉。

优先复用现有文件：

1. `src/features/procurement/useProcurementPageState.ts`

建议动作：

- [ ] 评估是否将与页面强耦合的筛选重置逻辑继续下沉到该 composable
- [ ] 检查 `summary filter`、`selection`、`empty text` 是否仍有页面泄漏职责
- [ ] 为已拆逻辑补测试

建议关联测试：

1. `tests/procurement-page-state.test.ts`

验收：

1. 页面层不再直接持有过多筛选状态细节。
2. 筛选相关行为仍由测试覆盖。

### 任务 5：抽出 Procurement normalize 纯函数

目标：把 store 里的数据标准化逻辑迁成纯函数，便于复用和测试。

建议新增文件：

1. `src/features/procurement/model/orderNormalizer.ts`

主要迁移来源：

1. `src/stores/useProcurementStore.ts`

建议迁移内容：

- [ ] `normalizeDateField`
- [ ] `isValidOrder`
- [ ] `normalizeOrderPayload`
- [ ] `normalizeOrderListPayload`
- [ ] `isNotFoundError`
- [ ] `logInvalidOrders`（可评估是否拆到 debug/logger helper）

建议保留在 store 的内容：

- [ ] state
- [ ] computed getter
- [ ] fetch/add/update/delete action 编排

建议关联测试：

1. 新增 `tests/procurement-order-normalizer.test.ts`

验收：

1. normalize 逻辑可独立测试。
2. store 文件职责更聚焦。

### 任务 6：抽出 Procurement summary/facet 纯函数

目标：把汇总统计逻辑从 store 中拿出来，避免状态层继续膨胀。

建议新增文件：

1. `src/features/procurement/model/orderSummary.ts`

主要迁移来源：

1. `src/stores/useProcurementStore.ts`

建议迁移内容：

- [ ] `buildSummaryFromOrders`
- [ ] `buildFacetCountsFromOrders`

建议关联测试：

1. 新增 `tests/procurement-order-summary.test.ts`

验收：

1. 汇总计算与 store 解耦。
2. summary/facet 结果有明确测试保护。

### 任务 7：收敛 Procurement Store 到“状态协调器”

目标：在不重写 store 的前提下，完成第一轮职责瘦身。

处理文件：

1. `src/stores/useProcurementStore.ts`

建议动作：

- [ ] 接入 `orderNormalizer.ts`
- [ ] 接入 `orderSummary.ts`
- [ ] 保持现有 action 签名不变
- [ ] 不在本周改动接口路径和业务流程

验收：

1. 对页面调用方无破坏。
2. store 可读性明显提升。

### 任务 8：补测试与回归保护

目标：确保第一周的“结构重构”不改变行为。

建议新增/更新测试：

1. `tests/procurement-order-normalizer.test.ts`
2. `tests/procurement-order-summary.test.ts`
3. `tests/procurement-page-state.test.ts`
4. `tests/procurement-dialogs.test.ts`
5. `tests/procurement-preview.test.ts`

建议检查：

- [ ] Procurement 页面路由 query 回填
- [ ] 筛选切换后分页与搜索行为
- [ ] summary card 快捷筛选
- [ ] 订单列表 normalize 后数据形态

### 任务 9：文档同步

目标：重构过程中同步沉淀，不让蓝图与实现脱节。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. `docs/progress/` 下新增第一周进展记录（如需要）

建议动作：

- [ ] 标记第一周已完成子任务
- [ ] 记录实际落地文件路径
- [ ] 记录与原计划不一致的调整点

## 4. 推荐执行顺序

建议按下面顺序落地：

1. 先做任务 1、任务 2
2. 再做任务 3、任务 4
3. 然后做任务 5、任务 6、任务 7
4. 最后做任务 8、任务 9

## 5. 推荐 PR 切分

### PR 1：共享契约落点

建议范围：

1. `src/shared/constants/*`
2. `src/shared/types/*`
3. `server/shared/contracts/*`
4. `server/shared/constants/*`

建议标题：

`refactor(contract): add shared api pagination and order constants`

### PR 2：Procurement 页面拆分

建议范围：

1. `src/features/procurement/composables/useProcurementRouteQuery.ts`
2. `src/views/Procurement.vue`
3. 相关测试

建议标题：

`refactor(procurement): extract route query and filter orchestration`

### PR 3：Procurement Store 纯函数下沉

建议范围：

1. `src/features/procurement/model/orderNormalizer.ts`
2. `src/features/procurement/model/orderSummary.ts`
3. `src/stores/useProcurementStore.ts`
4. 相关测试

建议标题：

`refactor(procurement): move order normalization and summary helpers out of store`

## 6. 本周验收清单

- [ ] `npm run type-check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Procurement 页面手工验证通过
- [ ] URL query 与筛选行为保持一致
- [ ] 无新增业务规则变更
- [ ] `git status --short` 仅包含预期文件

## 7. 本周不做的事

本周明确不做：

1. 不直接拆 `server/services/OrderService.js`
2. 不直接改数据库迁移机制
3. 不一次性统一全仓所有接口返回结构
4. 不做 inventory / formulas / mappings 的大范围结构迁移

这样可以保证第一周以最小风险建立模式，第二周再进入后端核心服务拆分。
