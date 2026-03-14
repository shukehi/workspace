# 第四周 Inventory 域复制模式清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md`
> - `docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md`
> 状态：in_progress
> 目标：在订单域完成服务拆分与 HTTP 层收口后，将同样的模块化模式复制到 inventory 域，优先收敛 `Inventory.vue` 与 `InventoryReceiptService.js`，降低库存相关功能继续膨胀的风险。

## 1. 第四周范围

本周聚焦 inventory 域，不扩展到 formulas、mappings、materials 的全面重构。

本周目标：

1. 识别 inventory 域前后端的核心职责边界。
2. 将 inventory 域按“页面/状态/服务/控制器/数据访问”模式收敛。
3. 复用前三周形成的错误处理、controller、service 拆分模式。
4. 优先拆解入库记录、撤销、路由筛选与分页编排链路。
5. 保持库存列表、入库记录、回退流程的行为稳定。

## 2. 第四周交付物

1. Inventory 域的职责映射说明。
2. 前端 `Inventory.vue` 的结构收敛结果。
3. 后端 `InventoryReceiptService.js` 与相关路由的模块化拆分结果。
4. inventory store 的次级收敛结果。
5. 与 inventory 相关的回归测试补充。

## 3. 执行面板

```text
Week 4
- Owner: TBD
- Status: in_progress
- Start Date: 2026-03-13
- Target Date:
- Exit Criteria:
  - inventory 域职责映射已完成并落到页面 / store / controller / service / repository
  - 前后端至少各完成一条模式复制并稳定接线
  - inventory 相关主链路回归已记录
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
  - 已在 `server/routes/inventoryReceipts.js` 复制 `controller + asyncHandler + errorHandler + validateRequest` 模式
  - 已新增 `server/controllers/inventory-receipt.controller.js` 与 `server/validators/inventory-receipt.validators.js`
  - 已将 inventory receipt 错误接入 `normalizeError`
  - 已新增 `src/features/inventory/composables/useInventoryReceiptRouteState.ts`，收敛 receipts route/filter/pagination 编排
  - 已新增 `src/features/inventory/composables/useInventoryReceiptFlow.ts`，收敛 receipts 撤销弹窗与轨迹审计编排
  - `src/views/Inventory.vue` 已改为消费 receipt route composable，保留页面装配职责
  - 已新增 `server/services/inventory/*`，将 `InventoryReceiptService.js` 收敛为兼容入口壳
  - 已新增 `server/controllers/inventory.controller.js` 与 `server/validators/inventory.validators.js`，`server/routes/inventory.js` 已切到 `controller + validateRequest + errorHandler`
  - 已新增 `server/services/inventory/inventory.{mapper,repository,service}.js`，`inventory.controller.js` 已改为消费 service
  - 已执行 `node --test tests/inventory-route.test.js`、`node --test tests/order-service.test.js`、`node --test tests/inventory-view-guard.test.js`、`npx tsx --test tests/inventory-receipt-route-state.test.ts tests/inventory-receipt-flow.test.ts` 与 `npm run type-check`
  - 已执行统一验收：`npm run build`、`npm test`
  - 2026-03-13 smoke：对运行中的 `http://127.0.0.1:3000` 完成 inventory list/update、receipt detail、receipt reverse 隔离验证，并在脚本结束后清理临时物料、订单、receipt 数据
  - 2026-03-13 smoke：`GET /api/inventory` 能读到临时物料；`PUT /api/inventory/:id` 成功将 `stock_quantity` 更新为 `21`、`min_stock` 更新为 `6`
  - 2026-03-13 smoke：针对隔离订单 `SMOKE-INV-PO-1773448921657`，`GET /api/inventory-receipts?orderId=...` 能取到入库记录，`GET /api/inventory-receipts/:id` 返回 `reversible_quantity = 2`
  - 2026-03-13 smoke：`POST /api/inventory-receipts/:id/reverse` 成功生成 reversal receipt，reverse 后库存回到 `21`，订单状态回到 `arrived`
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. inventory 域是在复用订单域模式，而不是复制新的耦合结构。
2. 页面层、store、service、controller 的职责边界能被明确说明。
3. 与订单入库、回退联动的行为已补最小回归。
4. 如果保留兼容转发层，必须标记后续清理点。

## 5. 重点关注对象

### 3.1 前端

1. `src/views/Inventory.vue`
2. `src/stores/useInventoryStore.ts`
3. `src/components/inventory/InventoryColumns.ts`
4. `src/components/inventory/InventoryReceiptColumns.ts`
5. `src/views/InventoryReceiptDetail.vue`

### 3.2 后端

1. `server/routes/inventory.js`
2. `server/routes/inventoryReceipts.js`
3. `server/services/InventoryReceiptService.js`
4. 可能关联的 material / order service 协作点

### 3.3 测试

1. `tests/inventory-route.test.js`
2. `tests/inventory-view-guard.test.js`
3. 与订单入库联动相关测试

## 6. 推荐目标结构

建议沿用订单域已经形成的模式，先在现有目录中平滑落地。

### 4.1 前端建议结构

```text
src/features/inventory/
├── api/
├── components/
├── composables/
├── model/
├── services/
└── pages/
```

### 4.2 后端建议结构

```text
server/services/inventory/
├── inventory.service.js
├── inventory-receipt.service.js
├── inventory.repository.js
├── inventory-receipt.repository.js
├── inventory.mapper.js
├── inventory.policy.js        # 如存在状态/回退规则
└── index.js

server/controllers/
├── inventory.controller.js
└── inventory-receipt.controller.js
```

说明：

1. 本周先复制模式，不强制一次性把全部旧文件删干净。
2. 可以先做兼容转发，再逐步切换引用。

## 7. 任务拆解

### 任务 1：Inventory 域职责盘点

目标：先建立 inventory 域的完整边界图，再开始拆分。

建议处理文件：

1. `src/views/Inventory.vue`
2. `src/stores/useInventoryStore.ts`
3. `server/routes/inventory.js`
4. `server/routes/inventoryReceipts.js`
5. `server/services/InventoryReceiptService.js`

建议动作：

- [ ] 列出库存列表职责
- [ ] 列出入库记录查询职责
- [ ] 列出回退/冲销职责
- [ ] 列出与订单状态联动职责
- [ ] 标出哪些逻辑属于页面层，哪些属于 store/service/repository

验收：

1. Inventory 域的职责分层清晰，避免复制订单域时照搬不适用结构。

### 任务 2：前端 Inventory 页面收敛

目标：让 `Inventory.vue` 回归页面装配层。

建议新增文件：

1. `src/features/inventory/composables/useInventoryPageState.ts`
2. `src/features/inventory/composables/useInventoryFilters.ts`
3. `src/features/inventory/composables/useInventoryReceiptFlow.ts`

建议迁移内容：

- [x] 分页、筛选、搜索状态（receipts route/filter/pagination 已下沉到 `useInventoryReceiptRouteState`）
- [ ] 入库记录弹窗或明细跳转编排
- [ ] 回退相关交互编排
- [ ] 列表刷新与联动逻辑

验收：

1. `src/views/Inventory.vue` 明显缩小。
2. 页面层主要只组合组件和 composable。

### 任务 3：前端 Inventory Store 收敛

目标：将 `useInventoryStore` 从综合逻辑容器收敛为状态协调器。

建议新增文件：

1. `src/features/inventory/model/inventoryNormalizer.ts`
2. `src/features/inventory/model/inventorySummary.ts`（如适用）
3. `src/features/inventory/api/inventoryApi.ts`

建议迁移内容：

- [ ] payload normalize
- [ ] query builder
- [ ] 汇总或统计类纯函数
- [ ] 错误识别与 DTO 适配

验收：

1. store 主要保留 state/getter/action 协调职责。
2. normalize/query 逻辑可独立测试。

### 任务 4：Inventory 路由 controller 化

目标：复用第三周模式，让 inventory 路由也进入 `route -> controller -> service` 结构。

建议新增文件：

1. `server/controllers/inventory.controller.js`
2. `server/controllers/inventory-receipt.controller.js`

建议接入文件：

1. `server/routes/inventory.js`
2. `server/routes/inventoryReceipts.js`

建议动作：

- [ ] 抽出库存列表与更新 controller
- [x] 抽出库存列表与更新 controller
- [ ] 抽出入库记录列表、详情、回退 controller
- [ ] 接入 `asyncHandler`
- [x] 接入统一成功/错误响应模式

验收：

1. inventory 路由文件明显瘦身。
2. 错误输出风格与订单域一致。

### 任务 5：Inventory Service 拆分

目标：对 `InventoryReceiptService` 及关联逻辑做模块化拆分。

建议新增文件：

1. `server/services/inventory/inventory.service.js`
2. `server/services/inventory/inventory-receipt.service.js`
3. `server/services/inventory/inventory.repository.js`
4. `server/services/inventory/inventory-receipt.repository.js`
5. `server/services/inventory/inventory.mapper.js`
6. `server/services/inventory/inventory.policy.js`（如需要）

建议拆分方向：

- [ ] 列表查询与筛选
- [x] 列表查询与筛选（已抽 `inventory-receipt.query-policy.js`）
- [ ] receipt 明细查询
- [x] reversal 校验与执行（已抽 `inventory-receipt.errors.js` / `policy.js` / `service.js`）
- [ ] 库存数量更新
- [ ] 与订单状态回写联动
- [x] DTO 序列化（已抽 `inventory-receipt.mapper.js`）

验收：

1. 库存回退与联动逻辑不再堆在单文件里。
2. 库存域的数据访问边界更明确。

### 任务 6：Inventory 域错误码与规则收敛

目标：避免 inventory 域继续沿用零散错误输出方式。

建议动作：

- [ ] 为回退理由缺失、数量越界、记录不存在等错误建立统一错误码
- [ ] 将库存域错误接入 `AppError` / `normalizeError`
- [ ] 与订单域错误风格保持一致

建议首批 inventory 错误码：

1. `INVENTORY_RECEIPT_NOT_FOUND`
2. `INVENTORY_REVERSE_REASON_REQUIRED`
3. `INVENTORY_REVERSE_QUANTITY_EXCEEDED`
4. `INVENTORY_ITEM_NOT_FOUND`

验收：

1. inventory API 的业务错误响应结构统一。

### 任务 7：补前端回归测试

目标：确保页面结构收敛不影响用户行为。

建议新增/调整测试：

1. `tests/inventory-page-state.test.ts`（如需要）
2. `tests/inventory-view-guard.test.js`

关键回归点：

- [ ] 库存列表展示
- [ ] 入库记录区域展示
- [ ] 订单过滤或关联筛选
- [ ] 明细跳转行为

### 任务 8：补后端回归测试

目标：锁住 inventory 域服务与路由重构风险。

重点测试文件：

1. `tests/inventory-route.test.js`
2. 与订单入库联动的测试文件

建议新增测试：

1. `tests/inventory-controller.test.js`（如 controller 足够独立）
2. `tests/inventory-policy.test.js`（如回退规则被抽出）

关键回归点：

- [ ] 库存列表查询
- [ ] 入库记录列表分页与筛选
- [ ] 入库记录详情
- [ ] reversal 正常回退
- [ ] partial reversal
- [ ] reverse reason 必填
- [ ] 回退后订单状态联动

### 任务 9：文档同步

目标：把 inventory 域的模式复制结果沉淀下来，形成可复用模板。

建议更新文件：

1. `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
2. `docs/progress/` 下新增 inventory 域阶段总结（如需要）

建议记录：

- [ ] inventory 域最终目录落点
- [ ] inventory 域错误码与 controller 模式
- [ ] 与订单域模式的差异点

## 6. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1
2. 再做任务 2、任务 3
3. 然后做任务 4、任务 5
4. 再做任务 6
5. 最后做任务 7、任务 8、任务 9

## 7. 推荐 PR 切分

### PR 1：Inventory 前端页面与 store 收敛

建议范围：

1. `src/views/Inventory.vue`
2. `src/stores/useInventoryStore.ts`
3. `src/features/inventory/*`
4. 前端相关测试

建议标题：

`refactor(inventory): extract page state and inventory helpers`

### PR 2：Inventory controller 化

建议范围：

1. `server/controllers/inventory.controller.js`
2. `server/controllers/inventory-receipt.controller.js`
3. `server/routes/inventory.js`
4. `server/routes/inventoryReceipts.js`

建议标题：

`refactor(inventory): move inventory http handling into controllers`

### PR 3：Inventory service 与 repository 拆分

建议范围：

1. `server/services/inventory/*`
2. 后端相关测试

建议标题：

`refactor(inventory): modularize receipt service and repositories`

## 8. 第四周验收清单

- [x] `npm test`
- [x] inventory 路由测试通过
- [x] inventory 视图守护测试通过
- [x] 库存回退主流程无回归
- [x] inventory 路由和 service 文件复杂度下降
- [x] inventory API 错误输出结构统一
- [ ] `git status --short` 仅包含预期改动

本轮已记录的 smoke：

1. 创建隔离物料后执行 `GET /api/inventory`，确认临时物料已出现在列表中
2. 执行 `PUT /api/inventory/:id`，确认 `stock_quantity = 21`、`min_stock = 6`
3. 通过隔离订单完成一次入库后，执行 `GET /api/inventory-receipts?orderId=...`，确认 receipt 列表可见
4. 执行 `GET /api/inventory-receipts/:id`，确认 `reversible_quantity = 2`
5. 执行 `POST /api/inventory-receipts/:id/reverse`，确认生成 reversal receipt，reverse 后库存恢复到 `21`、订单状态恢复为 `arrived`
6. 脚本结束后已清理临时物料、订单、订单明细与 inventory receipt 数据

## 9. 第四周不做的事

第四周明确不做：

1. 不同时重构 formulas / mappings / materials 全域
2. 不同步推进数据库 migration 框架升级
3. 不在本周开始后端 TypeScript 迁移
4. 不在 inventory 域之外做大范围 UI 改版

这样可以保证第四周的目标明确：把订单域验证过的模式复制到 inventory 域，并形成第二个稳定样板。

## 10. 第五周衔接建议

如果第四周完成顺利，第五周建议优先选择以下其一：

1. 推进 mappings 域的共享校验与 workflow 收敛
2. 开始 database migration 机制规范化
