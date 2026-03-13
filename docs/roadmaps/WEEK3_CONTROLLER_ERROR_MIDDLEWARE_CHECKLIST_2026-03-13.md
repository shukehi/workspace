# 第三周 Controller 与错误处理中间件清单（2026-03-13）

> 关联文档：
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
> - `docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
> - `docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md`
> 状态：todo
> 目标：在第二周完成 `OrderService` 模块化拆分后，继续将订单域的 HTTP 层升级为 `route -> controller -> service -> repository` 结构，并建立统一错误/请求校验中间件。

## 1. 第三周范围

本周重点只做订单域的 HTTP 层收口与错误处理基础设施，不在同一周全面推广到所有后端模块。

本周目标：

1. 将 `server/routes/order.js` 中的 HTTP 输入输出逻辑抽离为 controller。
2. 建立统一错误抽象与错误处理中间件。
3. 统一订单域的错误响应结构。
4. 为订单域补统一请求校验落点。
5. 为第四周推广到 inventory、materials、config routes 奠定模式。

## 2. 第三周交付物

1. 订单域 controller 文件。
2. 后端统一错误类或错误工厂。
3. 统一错误处理中间件。
4. 统一的 async handler 封装。
5. 订单域请求校验落点。
6. 订单路由切换后的回归测试。

## 3. 执行面板

```text
Week 3
- Owner: TBD
- Status: pending
- Start Date:
- Target Date:
- Exit Criteria:
  - `route -> controller -> service` 链路已在订单域跑通
  - `AppError`、`errorCodes`、`asyncHandler`、`errorHandler` 已接线
  - 订单域关键写接口已有统一请求校验落点
  - 关键 API 响应结构 diff 已核对并记录
  - 本周影响范围的测试、type-check、build 通过
- Blocking:
- PR / Issue:
- Notes:
```

## 4. 本周退出标准

除任务级验收外，本周完成前还应确认：

1. route 文件已明显收瘦，HTTP 输入输出职责主要落在 controller。
2. 错误处理中间件不会无意破坏现有成功/失败响应形态。
3. 未知错误、业务错误、校验错误至少各有一条清晰处理路径。
4. 关键写接口不再继续直接消费裸 `req.body` / `req.query`。
5. 至少记录一份关键订单 API 的前后响应样例对比。

## 5. 风险控制模板

```text
Risk:
- API 成功/失败响应结构可能改变
- route/controller 接线错误可能导致订单接口异常

Mitigation:
- 先采样现有关键接口响应，建立 diff 基线
- 按接口逐步切到 controller，不一次替换全部入口
- `AppError` 先兼容旧字段，再逐步统一调用方

Rollback:
- 回滚入口：将订单路由恢复直接调用原 service / 原错误包装逻辑
- 回滚条件：客户端依赖的错误结构变化、接口状态码异常、响应字段丢失
- 回滚后验证步骤：复测订单关键 API 的成功/失败样例并比对基线
```

## 6. 推荐目标结构

建议先在现有 `server/app/` 与 `server/controllers/` 基础上建立轻量结构，不强制本周完成全量目录迁移。

推荐结构：

```text
server/
├── app/
│   ├── errors/
│   │   ├── AppError.js
│   │   ├── errorCodes.js
│   │   └── normalizeError.js
│   ├── middleware/
│   │   ├── asyncHandler.js
│   │   ├── notFound.js
│   │   └── errorHandler.js
│   └── http/
│       └── response.js
├── controllers/
│   └── order.controller.js
├── routes/
│   └── order.js
└── services/
    └── orders/
```

说明：

1. 本周先建立基础设施层，不要求同步把所有旧路由都搬进 controller。
2. 订单域先行，其他域后续复制模式。

## 7. 建议新增文件

1. `server/app/errors/errorCodes.js`
2. `server/app/errors/AppError.js`
3. `server/app/errors/normalizeError.js`
4. `server/app/middleware/asyncHandler.js`
5. `server/app/middleware/errorHandler.js`
6. `server/app/middleware/notFound.js`
7. `server/app/http/response.js`
8. `server/controllers/order.controller.js`

## 8. 任务拆解

### 任务 1：定义统一错误码与错误抽象

目标：把“错误怎么表达”先定下来，再推进 route/controller 收口。

建议新增文件：

1. `server/app/errors/errorCodes.js`
2. `server/app/errors/AppError.js`

建议内容：

- `server/app/errors/errorCodes.js`
  - [ ] 定义通用错误码
  - [ ] 定义订单域错误码
  - [ ] 为后续 inventory/config 预留扩展空间

- `server/app/errors/AppError.js`
  - [ ] 定义统一错误类
  - [ ] 包含 `code/status/message/details/expose` 等字段
  - [ ] 支持包装未知错误为内部错误

建议首批错误码：

1. `INTERNAL_ERROR`
2. `NOT_FOUND`
3. `VALIDATION_ERROR`
4. `DUPLICATE_ORDER`
5. `INVALID_STATUS_TRANSITION`
6. `ORDER_EDIT_LOCKED`
7. `MATERIAL_NOT_FOUND`
8. `RECEIVED_QUANTITY_EXCEEDED`

验收：

1. 订单域错误码不再散落在 route 和 service 中。
2. 统一错误对象可以被中间件消费。

### 任务 2：建立错误归一化层

目标：兼容当前已有的普通 `Error`、自定义错误类和第三方异常。

建议新增文件：

1. `server/app/errors/normalizeError.js`

建议内容：

- [ ] 将订单域自定义错误转成 `AppError`
- [ ] 将 Sequelize 常见错误映射为统一格式
- [ ] 未知错误统一映射到 `INTERNAL_ERROR`
- [ ] 保留开发环境调试信息，控制生产环境暴露范围

建议接入来源：

1. `server/services/orders/order.errors.js`
2. 订单 service/repository 抛出的原始异常

验收：

1. error handler 不需要知道每种原始错误细节。
2. 旧错误与新错误可以共存过渡。

### 任务 3：建立统一 HTTP 响应辅助层

目标：统一 controller 成功返回格式，减少重复 `res.json(...)` 模板。

建议新增文件：

1. `server/app/http/response.js`

建议内容：

- [ ] `sendSuccess(res, data, meta?)`
- [ ] `sendCreated(res, data, meta?)`
- [ ] 如需要，可保留 `sendPaged(res, rows, pageMeta)`

注意：

- [ ] 本周优先统一订单域风格
- [ ] 对其他路由保持兼容，不强行一周内全部替换

验收：

1. controller 返回结构更稳定。
2. 成功响应模板重复减少。

### 任务 4：建立 async handler 中间件

目标：消除 controller/route 中重复 `try/catch(next)` 模板。

建议新增文件：

1. `server/app/middleware/asyncHandler.js`

建议内容：

- [ ] 包装 async controller
- [ ] 自动将异常转交给 `next`

验收：

1. controller 中不需要重复写大段异常传递逻辑。

### 任务 5：建立统一错误处理中间件

目标：让最终错误输出由单一位置负责。

建议新增文件：

1. `server/app/middleware/errorHandler.js`
2. `server/app/middleware/notFound.js`

建议内容：

- `errorHandler.js`
  - [ ] 接收任意错误
  - [ ] 调用 `normalizeError`
  - [ ] 输出统一 JSON 结构
  - [ ] 记录日志并区分开发/生产环境

- `notFound.js`
  - [ ] 统一未命中 API 路由的 404 输出
  - [ ] 与现有 API prefix 行为兼容

验收：

1. route 文件不再各自维护重复错误输出风格。
2. 404/4xx/5xx 输出结构一致。

### 任务 6：抽取订单 controller

目标：让订单路由回归 URL 绑定层，HTTP 细节由 controller 承担。

建议新增文件：

1. `server/controllers/order.controller.js`

建议拆分方法：

- [ ] `listOrders`
- [ ] `getOrderById`
- [ ] `createOrder`
- [ ] `updateOrder`
- [ ] `markOrderArrived`
- [ ] `stockInOrder`
- [ ] `deleteOrder`

controller 职责：

1. 读取 `req.params / req.query / req.body`
2. 调用 service
3. 调用 `sendSuccess/sendCreated`
4. 不承载核心业务规则

验收：

1. controller 文件可独立表达 HTTP 用例。
2. service 文件不感知 req/res。

### 任务 7：瘦身订单 route

目标：让 `server/routes/order.js` 只剩路由声明。

处理文件：

1. `server/routes/order.js`

建议动作：

- [ ] 引入 `order.controller.js`
- [ ] 引入 `asyncHandler`
- [ ] 删除大部分内联 `try/catch`
- [ ] 保持路由路径与方法不变

验收：

1. route 文件主要只剩 endpoint 映射。
2. 行数和复杂度显著下降。

### 任务 8：在应用入口接入中间件

目标：把错误收口真正接到服务器主流程里。

处理文件：

1. `server/index.js`
2. `server/routes/index.js`（如需要）

建议动作：

- [ ] 在路由挂载后接入 `notFound`
- [ ] 在最后接入 `errorHandler`
- [ ] 保留 SPA fallback 与 API 错误处理边界

建议注意：

- [ ] 需要处理好 `app.get('*')` 与 API 404 的先后关系
- [ ] 保证非 API 请求仍可回落到前端 `index.html`

验收：

1. API 错误可统一输出。
2. SPA fallback 不受影响。

### 任务 9：补测试与回归保护

目标：锁住第三周的 HTTP 层改造风险。

重点测试文件：

1. `tests/order-routes.test.js`
2. `tests/order-service.test.js`

建议新增测试：

1. `tests/order-controller.test.js`（如 controller 逻辑足够独立）
2. `tests/error-handler.test.js`

关键回归点：

- [ ] 订单 CRUD 返回结构保持兼容
- [ ] 404 输出符合统一格式
- [ ] 409 duplicate order 输出符合统一格式
- [ ] 400 invalid status transition 输出符合统一格式
- [ ] stock-in 相关业务错误输出符合统一格式
- [ ] 未知错误能落到统一 500 处理

## 6. 推荐执行顺序

建议按下面顺序推进：

1. 先做任务 1、任务 2
2. 再做任务 3、任务 4、任务 5
3. 然后做任务 6、任务 7
4. 再做任务 8
5. 最后做任务 9

## 7. 推荐 PR 切分

### PR 1：错误基础设施

建议范围：

1. `server/app/errors/*`
2. `server/app/middleware/asyncHandler.js`
3. `server/app/middleware/errorHandler.js`
4. `server/app/middleware/notFound.js`

建议标题：

`refactor(server): add app error and middleware foundation`

### PR 2：订单 controller 化

建议范围：

1. `server/controllers/order.controller.js`
2. `server/routes/order.js`
3. `server/app/http/response.js`

建议标题：

`refactor(order): move order http handling into controller`

### PR 3：入口接线与测试收口

建议范围：

1. `server/index.js`
2. 必要的 route/index 调整
3. 测试补充

建议标题：

`refactor(server): wire unified api error handling`

## 8. 第三周验收清单

- [ ] `npm test`
- [ ] 订单路由测试通过
- [ ] 订单服务测试继续通过
- [ ] API 错误响应结构统一
- [ ] route 文件复杂度下降
- [ ] `server/index.js` 错误处理链路稳定
- [ ] SPA fallback 正常

## 9. 第三周不做的事

第三周明确不做：

1. 不同时改造所有 routes 为 controller
2. 不同步推进 TypeScript 后端迁移
3. 不全面替换所有历史响应格式
4. 不开始数据库 migration 框架重构

这样可以保证第三周只解决“HTTP 层和错误处理收口”这一类问题。

## 10. 第四周衔接建议

如果第三周完成顺利，第四周建议：

1. 将同样模式推广到 inventory routes
2. 开始清理历史错误输出格式
3. 评估将 `server/services/orders/` 升级到 `server/modules/orders/` 目录结构
