# 第一周重构执行清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> 状态：completed
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
- Status: completed
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
  - 已新增 `src/shared/*`、`server/shared/*` 首批共享契约落点
  - 已新增 `useProcurementRouteQuery.ts`、`orderNormalizer.ts`、`orderSummary.ts`
  - 已跑 `npm run type-check`
  - 已跑 `npm run build`
  - 已跑 `npm test`
  - 已跑 Procurement/共享契约/API 兼容性定向测试
  - 已跑 `tests/order-routes.test.js` 和 `tests/api-contracts-route-shape.test.js`
  - 2026-03-13 smoke：访问 `/procurement`，点击“已到货”后 URL 正确同步到 `?status=arrived`；在搜索框输入“忠恒”后 URL 正确同步到 `?status=arrived&search=%E5%BF%A0%E6%81%92`，列表收敛到单条匹配订单
  - 2026-03-13 smoke：从筛选结果进入“查看/打印”，预览弹窗正常打开，客户名称、供应商、明细表格、立即打印与导出 PDF 入口均正常显示
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
  - [x] 抽取订单状态列表
  - [x] 抽取 pending 状态集合
  - [x] 补充共享状态标签映射

- `src/shared/constants/api.ts`
  - [x] 抽取常见错误码常量
  - [x] 抽取通用成功/失败标识约定

- `src/shared/types/api.ts`
  - [x] 定义统一成功返回类型
  - [x] 定义统一错误返回类型
  - [x] 定义校验错误类型

- `src/shared/types/pagination.ts`
  - [x] 定义分页请求参数类型
  - [x] 定义分页响应类型

- `server/shared/contracts/api.js`
  - [x] 定义后端错误码常量导出
  - [x] 定义统一错误响应构造函数

- `server/shared/contracts/pagination.js`
  - [x] 定义统一分页响应构造函数

- `server/shared/constants/order.js`
  - [x] 抽取状态枚举与 pending 集合

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
  - [x] 标记当前兼容逻辑哪些是临时保留
  - [x] 预留统一响应类型接入点
  - [x] 抽出 `normalizeApiEnvelope` 与 `resolveApiErrorMessage`

- `src/types/order.ts`
  - [x] 检查 `ProcurementOrderListResponse` 是否可迁入共享分页类型
  - [x] 标记与共享常量重复的状态定义

- `src/stores/useProcurementStore.ts`
  - [x] 标记当前使用的分页结构与错误结构
  - [x] 为后续下沉做注释或拆分准备

- `server/routes/order.js`
  - [x] 标记当前错误输出形态
  - [x] 标记哪些错误码后续应统一

- `server/routes/api.js`
  - [x] 标记哪些接口可优先切到统一返回风格
  - [x] 保留 `GET /api/contracts` 顶层 `rows/total` 兼容形态

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

- [x] `syncSearchQueryFromRoute`
- [x] `syncProcurementFiltersFromRoute`
- [x] `updateProcurementRouteQuery`
- [x] `buildProcurementQuery`
- [x] `procurementPage`
- [x] `procurementPageSize`

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

- [x] `normalizeDateField`
- [x] `isValidOrder`
- [x] `normalizeOrderPayload`
- [x] `normalizeOrderListPayload`
- [x] `isNotFoundError`
- [x] `logInvalidOrders`（当前先保留在 `orderNormalizer.ts`）

建议保留在 store 的内容：

- [ ] state
- [ ] computed getter
- [ ] fetch/add/update/delete action 编排

建议关联测试：

1. `tests/procurement-store-normalize.test.ts`（已改为直接校验 `orderNormalizer.ts`）

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

- [x] `buildSummaryFromOrders`
- [x] `buildFacetCountsFromOrders`

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

- [x] 接入 `orderNormalizer.ts`
- [x] 接入 `orderSummary.ts`
- [x] 保持现有 action 签名不变
- [x] 不在本周改动接口路径和业务流程

验收：

1. 对页面调用方无破坏。
2. store 可读性明显提升。

### 任务 8：补测试与回归保护

目标：确保第一周的“结构重构”不改变行为。

建议新增/更新测试：

1. `tests/api-contract-compat.test.ts`
2. `tests/shared-contracts.test.ts`
3. `tests/procurement-store-normalize.test.ts`
4. `tests/procurement-order-summary.test.ts`
5. `tests/procurement-route-query.test.ts`
6. `tests/procurement-page-state.test.ts`
7. `tests/order-routes.test.js`
8. `tests/api-contracts-route-shape.test.js`

建议检查：

- [x] Procurement 页面路由 query 回填
- [x] 筛选切换后分页与搜索行为
- [ ] summary card 快捷筛选
- [x] 订单列表 normalize 后数据形态

### 任务 9：文档同步

目标：重构过程中同步沉淀，不让蓝图与实现脱节。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. `docs/progress/` 下新增第一周进展记录（如需要）

建议动作：

- [x] 标记第一周已完成子任务
- [x] 记录实际落地文件路径
- [x] 记录与原计划不一致的调整点

本轮已实际落地文件：

1. `src/shared/constants/order.ts`
2. `src/shared/constants/api.ts`
3. `src/shared/types/api.ts`
4. `src/shared/types/pagination.ts`
5. `server/shared/contracts/api.js`
6. `server/shared/contracts/pagination.js`
7. `server/shared/constants/order.js`
8. `src/features/procurement/composables/useProcurementRouteQuery.ts`
9. `src/features/procurement/model/orderNormalizer.ts`
10. `src/features/procurement/model/orderSummary.ts`
11. `src/lib/api.ts`
12. `src/stores/useProcurementStore.ts`
13. `src/views/Procurement.vue`

与原计划不一致但已记录的调整：

1. `tests/procurement-store-normalize.test.ts` 直接改为覆盖 `orderNormalizer.ts`，未新建单独 `procurement-order-normalizer.test.ts`
2. `server/routes/api.js` 中 `GET /api/contracts` 保留旧顶层 `rows/total` 契约，暂不切 `{ success, data }` envelope

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

- [x] `npm run type-check`
- [x] `npm test`
- [x] `npm run build`
- [x] Procurement 页面手工验证通过
- [x] URL query 与筛选行为保持一致
- [x] 无新增业务规则变更
- [x] `git status --short` 仅包含预期文件

本轮已执行的定向验证：

1. `npm run type-check`
2. `npx tsx --test tests/api-contract-compat.test.ts tests/shared-contracts.test.ts tests/procurement-store-normalize.test.ts tests/procurement-order-summary.test.ts tests/procurement-route-query.test.ts tests/procurement-page-state.test.ts`
3. `node --test tests/order-routes.test.js`
4. `node --test tests/api-contracts-route-shape.test.js`

本轮已记录的 smoke：

1. 访问 `http://127.0.0.1:5173/procurement`
2. 点击“已到货”，确认 URL 变为 `?status=arrived`
3. 输入“忠恒”，确认 URL 变为 `?status=arrived&search=%E5%BF%A0%E6%81%92`，且结果收敛到单条匹配订单
4. 点击“查看/打印”，确认预览弹窗正常打开，客户名称、供应商、明细表格、立即打印与导出 PDF 入口均可见

## 7. 本周不做的事

本周明确不做：

1. 不直接拆 `server/services/OrderService.js`
2. 不直接改数据库迁移机制
3. 不一次性统一全仓所有接口返回结构
4. 不做 inventory / formulas / mappings 的大范围结构迁移

这样可以保证第一周以最小风险建立模式，第二周再进入后端核心服务拆分。
