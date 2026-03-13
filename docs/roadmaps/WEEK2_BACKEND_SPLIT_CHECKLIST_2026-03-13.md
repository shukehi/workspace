# 第二周后端拆分清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md`
> 状态：todo
> 目标：为第二周的后端核心拆分建立可直接执行的文件级计划，重点围绕 `server/services/OrderService.js`。

## 1. 第二周范围

第二周聚焦后端订单域，不扩散到 inventory、formulas、mappings 的大范围重构。

本周目标：

1. 将 `server/services/OrderService.js` 从超大综合服务拆为多个职责明确的子模块。
2. 保持订单 API 对外行为不变。
3. 为第三周的统一错误处理中间件和 controller 化改造铺路。
4. 不在本周引入数据库迁移机制大改。

## 2. 第二周交付物

1. 一个新的订单模块目录或等价分层结构。
2. 从 `OrderService` 中拆出的 policy、dedupe、mapper、stock-in、repository 辅助模块。
3. 经过回归测试验证的订单服务主链路。
4. 一份本周重构后的职责映射说明。

## 3. 执行面板

```text
Week 2
- Owner: TBD
- Status: pending
- Start Date:
- Target Date:
- Exit Criteria:
  - `OrderService` 已拆分为明确子模块，且主入口兼容现有调用
  - 订单主流程回归清单已执行并记录结果
  - 新旧模块职责映射文档已补齐
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. 拆分不是简单挪文件，policy / dedupe / mapper / stock-in / repository 职责可明确描述。
2. 对外 API 行为未发生非预期变化；如有调整，必须补契约 diff 或兼容说明。
3. 拆分后的主入口仍然单点可控，避免同时暴露多套长期并存调用方式。
4. 至少记录创建、更新、去重、入库四条主链路的回归结果。

## 5. 风险控制模板

```text
Risk:
- 订单创建、更新、入库、去重主链路可能回归
- 模块迁移过程中可能出现接口未对齐或状态规则丢失

Mitigation:
- 按 抽错误定义 -> 抽 policy -> 抽 repository -> 抽 mapper / stock-in -> 收口主 service 的顺序渐进拆分
- 每迁出一个子模块就跑一次最小主链路验证
- 保持旧 service 入口不变，先做内部替换，再考虑目录升级

Rollback:
- 回滚入口：恢复 `server/services/OrderService.js` 的旧编排，子模块改为停止引用
- 回滚条件：订单主流程回归失败、状态流转异常、入库数量校验失真
- 回滚后验证步骤：重跑订单主链路回归并确认 API 响应与拆分前一致
```

## 6. 推荐目标结构

建议先在现有 `server/services/` 体系下平滑落地，避免本周同时做过多目录搬迁。

推荐第一步结构：

```text
server/services/orders/
├── order.service.js         # 应用编排入口，暂时替代原 OrderService 主体
├── order.repository.js      # 订单数据访问
├── order.policy.js          # 状态流转、字段编辑规则
├── order.dedupe.js          # 防重与幂等 key
├── order.mapper.js          # DTO 序列化
├── order.stockin.js         # 入库与数量校验
├── order.errors.js          # 订单域错误定义
└── index.js                 # 统一导出兼容层
```

说明：

1. 本周先拆职责，不强制立即搬到 `server/modules/orders/`。
2. 等 controller/error middleware 稳定后，再做目录升级到模块目录。

## 7. 建议新增文件

1. `server/services/orders/order.errors.js`
2. `server/services/orders/order.policy.js`
3. `server/services/orders/order.dedupe.js`
4. `server/services/orders/order.mapper.js`
5. `server/services/orders/order.stockin.js`
6. `server/services/orders/order.repository.js`
7. `server/services/orders/order.service.js`
8. `server/services/orders/index.js`

## 8. 任务拆解

### 任务 1：梳理 OrderService 职责边界

目标：先拆思路，再拆代码，避免一边搬一边改乱。

处理文件：

1. `server/services/OrderService.js`

建议动作：

- [ ] 列出查询职责
- [ ] 列出创建/更新/删除职责
- [ ] 列出状态流转职责
- [ ] 列出防重职责
- [ ] 列出入库职责
- [ ] 列出序列化与日志辅助职责

建议输出：

1. 在本周进度文档中记录一份“旧函数 -> 新模块”的映射表

验收：

1. 所有核心函数都有明确归属，不出现“拆到一半不知道放哪”的情况。

### 任务 2：抽取订单域错误定义

目标：先把错误类型从主服务中抽出来，降低主文件噪音。

建议新增文件：

1. `server/services/orders/order.errors.js`

建议迁移内容：

- [ ] `DuplicateOrderError`
- [ ] `InvalidStatusTransitionError`
- [ ] `MissingMaterialError`
- [ ] `OrderEditLockedError`
- [ ] `ReceivedQuantityExceededError`

建议额外补充：

- [ ] 统一导出错误码常量
- [ ] 为后续 error middleware 预留 `code` 字段规范

验收：

1. `OrderService` 不再内嵌大量错误类定义。
2. route 和 service 后续都能复用同一错误来源。

### 任务 3：抽取状态策略层

目标：将“订单状态机”与“编辑权限规则”独立出来。

建议新增文件：

1. `server/services/orders/order.policy.js`

建议迁移内容：

- [ ] `ORDER_STATUSES`
- [ ] `ALLOWED_STATUS_TRANSITIONS`
- [ ] `normalizeStatus`
- [ ] `assertValidStatusTransition`
- [ ] `ARRIVED_EDITABLE_FIELDS`
- [ ] `COMPLETED_EDITABLE_FIELDS`
- [ ] `assertEditableOrderFields`

建议新增测试：

1. `tests/order-policy.test.js`

验收：

1. 状态流转规则可独立测试。
2. 后续新增状态规则时只改 policy 层。

### 任务 4：抽取防重与幂等层

目标：把自动单防重逻辑从主服务中剥离。

建议新增文件：

1. `server/services/orders/order.dedupe.js`

建议迁移内容：

- [ ] `normalizeOrderRemark`（如仍需要）
- [ ] `resolveSourceContractCode`
- [ ] `normalizeMetadata`
- [ ] `normalizeDedupeText`
- [ ] `normalizeDedupeNumber`
- [ ] `serializeItemFingerprint`
- [ ] `buildOrderDedupePayload`
- [ ] `buildOrderDedupeKey`

建议检查点：

- [ ] 自动单与手动单的边界不要变化
- [ ] source contract code 的兼容行为不要变化

建议关联测试：

1. 扩展 `tests/order-service.test.js`
2. 视情况新增 `tests/order-dedupe.test.js`

验收：

1. 防重逻辑集中在单一模块。
2. 订单创建/恢复行为与现状一致。

### 任务 5：抽取 mapper 层

目标：把响应数据标准化与日志辅助从业务编排中解耦。

建议新增文件：

1. `server/services/orders/order.mapper.js`

建议迁移内容：

- [ ] `normalizeDateField`
- [ ] `resolveOrderedQuantity`
- [ ] `serializeOrderItem`
- [ ] `serializeOrder`
- [ ] `normalizeOrderForLog`
- [ ] 其他日志输出辅助函数

验收：

1. route 对外返回 shape 保持不变。
2. DTO 序列化不再散落在 service 主流程中。

### 任务 6：抽取 stock-in 层

目标：把入库链路从订单 CRUD 主流程中分离出来。

建议新增文件：

1. `server/services/orders/order.stockin.js`

建议迁移内容：

- [ ] order item 入库数量校验
- [ ] explicit receipt items 校验
- [ ] ordered/received quantity 回退逻辑
- [ ] material 校验与缺失错误抛出
- [ ] 库存联动与 receipt 创建流程中的辅助函数

建议注意：

- [ ] 该文件可以先抽辅助函数，再逐步接管完整 stock-in 流程
- [ ] 本周不强行把全部事务拆得过细，先保证职责分离和测试稳定

建议关联测试：

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`

验收：

1. stock-in 复杂逻辑不再压在主服务文件里。
2. arrived/completed/partial receipt 等关键路径保持通过。

### 任务 7：抽取 repository 层

目标：隔离 Sequelize 访问细节，给后续迁移与测试打基础。

建议新增文件：

1. `server/services/orders/order.repository.js`

建议迁移内容：

- [ ] 按 id 查询订单
- [ ] 分页查询订单
- [ ] 获取全部订单
- [ ] 创建订单及明细
- [ ] 更新订单及明细
- [ ] 删除订单
- [ ] 查询/写入 idempotency key

建议策略：

- [ ] 第一周式平滑迁移：先抽 query helper，不一次性抽尽所有 DB 操作
- [ ] 显式标注 transaction 由谁开启、由谁传递

验收：

1. service 与模型层耦合降低。
2. repository 方法命名可表达业务意图。

### 任务 8：建立新的服务编排入口

目标：让 `order.service.js` 成为真正的应用编排层。

建议新增文件：

1. `server/services/orders/order.service.js`
2. `server/services/orders/index.js`

建议动作：

- [ ] 将原 `OrderService` 对外导出的方法迁到新入口
- [ ] 在新入口中组合 policy/dedupe/mapper/stockin/repository
- [ ] 保持原导出方法名不变，降低 route 改造成本

兼容策略：

- [ ] 暂时保留 `server/services/OrderService.js` 作为兼容壳文件
- [ ] 壳文件仅转发到 `server/services/orders/index.js`

验收：

1. route 层可无感切换。
2. 后续 controller 化改造不需要再次大搬迁。

### 任务 9：最小化改动 route 接入

目标：本周不做 controller 化，但要保证后续好接。

处理文件：

1. `server/routes/order.js`

建议动作：

- [ ] 将对 `OrderService` 的引用切换到新的兼容入口
- [ ] 保持 HTTP 响应语义不变
- [ ] 尽量不在本周修改路由层大段错误处理

验收：

1. API 对外行为保持一致。
2. 为下一周 controller/error middleware 改造保留空间。

### 任务 10：补测试与回归保护

目标：用测试锁住第二周的后端重构风险。

重点测试文件：

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`

建议新增测试：

1. `tests/order-policy.test.js`
2. `tests/order-dedupe.test.js`（如拆分收益明显）
3. `tests/order-mapper.test.js`（如序列化逻辑足够独立）

关键回归点：

- [ ] 订单 CRUD
- [ ] category filter
- [ ] duplicate auto order 防重
- [ ] cancelled auto order 恢复
- [ ] invalid status transition
- [ ] arrived order 编辑限制
- [ ] stock-in 正常入库
- [ ] partial receipt
- [ ] received quantity overflow
- [ ] legacy item key 兼容

## 6. 建议执行顺序

建议按下面顺序推进：

1. 先做任务 1、任务 2
2. 再做任务 3、任务 4、任务 5
3. 然后做任务 6、任务 7
4. 再做任务 8、任务 9
5. 最后做任务 10

## 7. 推荐 PR 切分

### PR 1：订单错误与策略层

建议范围：

1. `server/services/orders/order.errors.js`
2. `server/services/orders/order.policy.js`
3. 相关测试

建议标题：

`refactor(order): extract order errors and status policy`

### PR 2：订单防重与序列化层

建议范围：

1. `server/services/orders/order.dedupe.js`
2. `server/services/orders/order.mapper.js`
3. 相关测试

建议标题：

`refactor(order): isolate dedupe and mapping helpers`

### PR 3：订单入库与 repository 层

建议范围：

1. `server/services/orders/order.stockin.js`
2. `server/services/orders/order.repository.js`
3. 相关测试

建议标题：

`refactor(order): extract stock-in and repository helpers`

### PR 4：订单服务编排入口切换

建议范围：

1. `server/services/orders/order.service.js`
2. `server/services/orders/index.js`
3. `server/services/OrderService.js`
4. `server/routes/order.js`

建议标题：

`refactor(order): move OrderService to modular service entry`

## 8. 第二周验收清单

- [ ] `npm test`
- [ ] 订单相关测试全部通过
- [ ] 库存联动相关测试通过
- [ ] 订单接口行为无回归
- [ ] `server/services/OrderService.js` 显著缩小或仅保留兼容壳
- [ ] 新增模块职责清晰且命名稳定
- [ ] `git status --short` 仅包含预期改动

## 9. 第二周不做的事

第二周明确不做：

1. 不同时大改 `server/routes/inventory.js`、`server/routes/material.js` 等其他路由
2. 不同步引入 controller + middleware 双重重构
3. 不同时切换到 TypeScript
4. 不在本周推进 migration 框架全面落地

这样可以保证第二周只解决一个核心问题：把订单后端服务从“单文件复杂中心”拆成“可持续演进的模块”。

## 10. 第三周衔接建议

如果第二周完成良好，第三周建议顺着下面方向继续：

1. 将 `server/routes/order.js` 进一步拆为 controller
2. 建立统一错误处理中间件
3. 开始复用订单域模式到 inventory 域
