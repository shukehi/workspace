# 系统优化计划

**状态**：部分完成（2026-03-18 历史计划；前端与 P1 后端/API stale-check 已刷新于 2026-04-30）
**日期**：2026-03-18
**范围**：全系统架构审查，基于代码实际读取分析

> 2026-04-30 前端 stale-check：本计划中的前端相关旧项已按当前代码重新核对。`src/lib/api.ts` 已通过 `VITE_API_KEY` 注入 `x-api-key`、统一解包 `{ success, data }`，并暴露取消请求识别；`src/stores/useProcurementStore.ts` 已对 `fetchOrders` 使用 `AbortController`、分页 `/orders` 参数和 `normalizeOrderListPayload`。因此 request race、API key header、采购订单响应 normalizer 与前端分页触点不再是新的前端实现入口；如需继续推进，应拆成后端/API 契约或发布验证任务，而不是重开 Config Center、Procurement 或 Master Data 前端实现。

> 2026-04-30 P1 后端/API stale-check：P1-1 数据库级分页/过滤、P1-2 `/api` API key mount、P1-3 查询索引迁移、P1-4 CORS 明确 origin 默认值均已在当前代码中落地，并已补强 `/api/orders` auth、迁移索引名、CORS env focused guards。当前状态索引见 `docs/progress/BRANCH_PROGRESS_SYSTEM_OPTIMIZATION_BACKEND_API_STALE_CHECK_2026-04-30.md`；最小后续 lane 是发布配置验证，不是重开大规模后端重写。

---

## 背景

本文档记录对当前系统的架构审查结论，并给出按优先级排列的优化方案。审查覆盖后端服务层、数据访问层、API 设计、前端状态管理、数据库设计及安全性六个维度。

---

## 一、高优先级问题（需立即修复）

### P1-1：全量加载 + 内存分页（性能炸弹）

**问题文件**：`server/services/orders/order.service.ts`

**现状**：
```typescript
async getPaginatedOrders(query: PlainRecord = {}) {
    const orders = await this.getAllOrders();          // 每次加载全部订单
    const filteredOrders = filterOrders(orders, query); // 内存过滤
    const rows = filteredOrders.slice(start, start + pageSize); // 客户端分页
}
```

`getAllOrders` 内部通过 `order.repository.ts` 的 `findAllOrdersWithItems` 一次性加载所有订单及其关联 item，即使只需展示第一页。

**影响估算**：订单量达到 1,000 条时，每次翻页触发 1 次全量主查询 + ~1,000 次 item 关联查询（N+1），内存中加载全量数据后丢弃 99%。

**优化方案**：改为数据库级分页和过滤。

```typescript
// order.repository.ts
async function findOrdersPaginated(where: WhereOptions, page: number, pageSize: number) {
    return await Order.findAndCountAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
}
```

过滤条件（`category`、`status`、`supplier` 等）也应通过 Sequelize `where` 子句传入，而不是在内存中 `filterOrders`。

**2026-04-30 前端状态**：前端分页触点已完成。`useProcurementStore.fetchOrders(nextQuery)` 发送分页查询参数、读取 `normalizeOrderListPayload` 后维护 `ordersTotal` / `ordersPage` / `ordersPageSize` / `serverPaginationEnabled`，`fetchAllOrders` 也按页拉取。P1-1 的剩余判断应归入后端数据库级分页/索引证据，不应作为新的前端实现任务。

**2026-04-30 后端/API 状态**：已完成。当前 `OrderService.getPaginatedOrders` 委托 `order.service.query.ts`，先通过 `getPaginatedOrderAggregates(query)` 计算全结果摘要/分面，再用 `findPaginatedOrderIds(query, page, pageSize)` 在 SQL 层应用 `WHERE`、`ORDER BY`、`LIMIT`、`OFFSET`，最后按分页 id 回读带 items 的订单。`buildOrderQuerySql` 已覆盖 status、category、supplier、createdDate/date range、orderNo、keyword、risk；因此旧文档中的“每次 getAllOrders + 内存 slice”路径对 `/orders` 分页查询已过期。证据见 `server/services/orders/order.service.ts`、`server/services/orders/order.service.query.ts`、`server/services/orders/order.repository.ts`，以及 `tests/order-service.test.ts` 中“DB-level filters and full-result aggregates aligned”的守卫。

**执行步骤**：
1. 在 `order.repository.ts` 新增 `findOrdersPaginated(where, page, pageSize)` 方法
2. 在 `order.service.ts` 的 `getPaginatedOrders` 中将 `filterOrders` 逻辑转换为 `where` 条件
3. 为 `orders` 表的 `category`、`status`、`source_contract_code`、`supplier` 字段添加数据库索引（见 P1-3）
4. 删除 `order.query-policy.ts` 中已被迁移的内存过滤逻辑

---

### P1-2：完全缺少认证和授权

**问题文件**：`server/routes/order.js`、`server/routes/inventory.js`、`server/routes/api.js` 等所有路由文件

**现状**：所有 API 端点均公开，无任何认证中间件。任意客户端均可删除订单、修改配置、清空库存。

**优化方案**（按复杂度由低到高选择）：

**方案 A（最小成本，适合内网系统）**：固定 API Token 中间件

```typescript
// server/app/middleware/apiKeyAuth.ts
export function apiKeyAuth(req, res, next) {
    const token = req.headers['x-api-key'];
    if (!token || token !== process.env.API_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}
```

在 `server/index.js` 中对所有 `/api` 路由应用：

```javascript
app.use('/api', apiKeyAuth, apiRouter);
```

**方案 B（推荐，适合多用户场景）**：基于 JWT 的简单认证，区分只读和写操作权限。

**2026-04-30 前端状态**：API key header 前端部分已完成。`src/lib/api.ts` 的 Axios 实例会在存在 `VITE_API_KEY` 时携带 `x-api-key`；前端无需新增实现。服务端认证覆盖率仍应由后端/API 发布验证单独确认。

**2026-04-30 后端/API 状态**：已完成，发布时仍需确认环境变量。`server/routes/index.ts` 在挂载 `/api/config/profiles`、`/api/config/masters` 和聚合 `apiRoutes` 之前执行 `router.use(config.api.prefix, apiKeyAuth)`，因此 `/api` 前缀路由共享 API key guard。`apiKeyAuth` 在生产环境缺少 `API_KEY` 时返回 `SERVER_MISCONFIGURATION`，配置后对缺失/错误 `x-api-key` 返回 `UNAUTHORIZED`。证据见 `tests/api-key-auth.test.ts` 与 `tests/config-profile-auth-boundary.test.ts`。

**执行步骤**：
1. 在 `.env` 中添加 `API_KEY` 配置项
2. 实现 `apiKeyAuth` 中间件
3. 在路由注册处统一应用
4. 更新前端 Axios 实例，在请求头中携带 token

---

### P1-3：数据库缺少关键索引

**问题文件**：`server/db/migrate.js`（迁移脚本中未定义索引）

**需要添加的索引**：

```sql
-- orders 表高频查询字段
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier);
CREATE INDEX IF NOT EXISTS idx_orders_source_contract_code ON orders(source_contract_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- order_items 表关联查询
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON order_items(material_id);

-- inventory_receipts 表
CREATE INDEX IF NOT EXISTS idx_inventory_receipts_order_id ON inventory_receipts(order_id);
```

**2026-04-30 后端/API 状态**：已完成并补充 focused guard。当前迁移 `server/db/migrations/20260318-006-add-query-indexes.ts` 已创建本节列出的全部索引：`idx_orders_status`、`idx_orders_category`、`idx_orders_supplier`、`idx_orders_source_contract_code`、`idx_orders_created_at`、`idx_order_items_order_id`、`idx_order_items_material_id`、`idx_inventory_receipts_order_id`。`tests/db-migrations.test.ts` 保护该迁移 id 不被删除，并断言这些索引名存在。

**执行步骤**：已由 `server/db/migrations/20260318-006-add-query-indexes.ts` 落地；不要再新建重复迁移，除非发现当前迁移未在目标环境执行。

---

### P1-4：CORS 配置矛盾

**问题文件**：`server/config/env.js`

**现状**：
```javascript
cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true  // ← 与 origin:'*' 同时使用，浏览器会拒绝带凭证的请求
}
```

`Access-Control-Allow-Credentials: true` 要求 `Access-Control-Allow-Origin` 必须是具体域名，不能是通配符 `*`，否则浏览器会阻止请求。

**优化方案**：

```javascript
cors: {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')  // 支持多个来源：'http://localhost:5173,http://192.168.1.x:5173'
        : 'http://localhost:5173',
    credentials: true,
}
```

在生产/局域网部署时，`.env` 中配置实际访问地址：
```
CORS_ORIGIN=http://192.168.1.100:5173
```

**2026-04-30 后端/API 状态**：已完成并补充 focused guard。`server/config/env.ts` 默认 `origin` 为具体的 `http://localhost:5173`，配置 `CORS_ORIGIN` 时按逗号拆分并 trim，同时保持 `credentials: true`，旧的 `origin: '*' + credentials` 矛盾已过期。`tests/env-config-cors.test.ts` 覆盖默认值、多 origin 拆分与 `credentials: true`。后续只需发布配置验证，不应改运行时代码。

---

## 二、中优先级问题

### P2-1：兼容性桥接层导致的命名混乱

**问题文件**：
- `server/services/OrderService.ts`（外层转发壳）
- `server/services/orders/order.service.ts`（实际业务逻辑）
- `server/services/InventoryReceiptService.ts`（同样的转发壳）

**现状**：存在两套同名服务，外层文件仅做转发，实际逻辑在内层。维护时容易改错位置，且掩盖了 `OrderService` → `InventoryReceiptService` 的跨域耦合。

**优化方案**：

1. 逐步将路由和控制器中的引用从 `OrderService.ts` 改为直接引用 `orders/order.service.ts`
2. 删除外层转发壳
3. 将 `OrderService` 对 `InventoryReceiptService` 的直接调用（`order.service.ts` 第5行）改为通过事件或在上层 Controller 中组合，消除跨域服务依赖

**参考**：`docs/governance/COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md` 中已有相关退场策略，按该文档执行。

---

### P2-2：`PlainRecord` 类型架空 TypeScript

**问题文件**：`server/services/orders/order.service.ts`、多个 service 文件

**现状**：
```typescript
type PlainRecord = Record<string, any>; // 大量用于函数参数和返回值
```

大量函数签名使用 `PlainRecord`，导致 TypeScript 类型检查失效，IDE 无法提示属性名，运行时属性名拼写错误无法提前发现。

**优化方案**：逐步为高频使用的函数参数补充具体类型定义。

优先覆盖范围：
- `getPaginatedOrders(query: OrderListQuery)` — 明确分页参数类型
- `createOrder(data: CreateOrderInput)` — 明确创建参数类型
- `updateOrder(id, data: UpdateOrderInput)` — 明确更新参数类型

具体类型定义可统一放入 `server/models/types.ts` 并从各 service 引用。

---

### P2-3：前端请求竞态（Race Condition）

**问题文件**：`src/stores/useProcurementStore.ts`

**现状**：用户快速切换筛选条件时，先发出的请求响应可能晚于后发出的请求，导致旧数据覆盖新数据。

**优化方案**：在 store 中使用 `AbortController` 取消上一次未完成的请求。

```typescript
let abortController: AbortController | null = null;

async function fetchOrders(nextQuery?: ProcurementOrderQuery) {
    // 取消上一次未完成的请求
    abortController?.abort();
    abortController = new AbortController();

    loading.value = true;
    try {
        const res = await api.get('/orders', {
            params: { ...nextQuery },
            signal: abortController.signal,
        });
        purchaseOrders.value = res.data.rows;
    } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
            // 只处理非取消的错误
            handleError(err);
        }
    } finally {
        loading.value = false;
    }
}
```

**2026-04-30 前端状态**：已完成。当前 `fetchOrders` 每次请求前都会 abort 上一个 `AbortController`，并将 `AbortError` / `CanceledError` 视为有意取消；`src/lib/api.ts` 同时提供 `isCanceledRequestError` 供其他调用点复用。该项不再是前端缺口。

---

### P2-4：API 响应结构不一致

**问题文件**：`server/routes/api.js`、`server/services/orders/order.service.ts`、多个路由文件

**现状**：不同端点使用不同响应结构：
- `/orders` → `{ success, rows, total, page, pageSize }`
- `/contracts` → `{ success, rows, total }`（展开）
- 其他端点 → `{ success, data }`

**优化方案**：统一分页接口响应格式：

```typescript
// server/app/http/response.ts
export function paginatedResponse(rows: unknown[], total: number, page: number, pageSize: number) {
    return { success: true, data: { rows, total, page, pageSize } };
}

export function singleResponse(data: unknown) {
    return { success: true, data };
}
```

分阶段将现有端点迁移到统一格式，前端对应更新 normalizer。

**2026-04-30 前端状态**：前端兼容 normalizer 已完成，统一服务端响应契约仍是独立 API/后端治理项。`src/lib/api.ts` 的 `normalizeApiEnvelope` 已兼容原始 payload 与 `{ success, data }`；采购订单列表由 `normalizeOrderListPayload` 统一处理 `rows/total/page/pageSize/summary/facets`，相关守护测试覆盖 `api-contract-compat` 与采购 store normalizer/query 行为。不要把 P2-4 当作新的前端实现入口，除非后续 API 契约迁移产生具体失败用例。

---

### P2-5：`OrderItem` 字段语义不清

**问题文件**：`server/models/OrderItem.ts`、`server/models/types.ts`

**现状**：
```typescript
quantity: DataTypes.FLOAT,
ordered_quantity: DataTypes.FLOAT,
quantity_left: DataTypes.FLOAT,   // 语义不明
quantity_right: DataTypes.FLOAT,  // 语义不明
```

`quantity` 与 `ordered_quantity` 的区别未在代码中明确，`quantity_left/right` 含义仅通过字段名推测（门锁左开/右开数量拆分）。

**优化方案**：
1. 在 `server/models/types.ts` 的 `OrderItemAttributes` 接口中为每个字段添加 JSDoc 注释说明语义
2. 评估 `quantity` 与 `ordered_quantity` 是否可以合并（如二者实际含义相同，保留一个，迁移数据后删除另一个）
3. 将 `quantity_left/right` 重命名为更明确的 `quantity_left_open/quantity_right_open`，通过迁移脚本处理

---

## 三、低优先级问题

### P3-1：缺少结构化日志

**问题文件**：`server/index.js`

**现状**：仅在开发环境下用 `console.log` 打印请求日志，生产环境无可观测性。

**优化方案**：引入轻量日志库（如 `pino`）：

```javascript
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// 替换现有的 console.log 请求日志
app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, 'request');
    next();
});
```

在错误处理中间件中同步引用，确保错误有完整堆栈记录。

---

### P3-2：状态转换 API 不统一

**问题文件**：`server/routes/order.js`

**现状**：
```javascript
PUT  /orders/:id/status   // 更新状态
POST /orders/:id/arrive   // 实质也是更新状态
POST /orders/:id/stock-in // 实质也是更新状态
```

**优化方案**：统一为 `PUT /orders/:id/status`，通过请求体中的 `status` 字段区分目标状态。保留旧端点作为向后兼容别名，在下一个 major 版本中移除。

---

### P3-3：验证逻辑分散在三处

**问题文件**：
- `server/validators/order.validators.ts`（请求格式验证）
- `server/services/orders/order.policy.ts`（状态流转验证）
- `server/services/orders/order.stockin.ts`（库存入库验证）

三处验证规则独立维护，容易出现矛盾或遗漏。

**优化方案**：保持分层，但明确职责边界：
- `validators/`：仅做请求格式和字段合法性验证（类型、必填、范围）
- `services/*/policy.ts`：做业务规则验证（状态合法性、库存充足性等）
- 禁止在 validator 层做业务判断，禁止在 service 层重复做格式验证

---

### P3-4：缺少缓存策略

**问题**：材料目录、配方定义、映射配置等低频变化的数据，每次请求都从磁盘/数据库读取，没有内存缓存。

**优化方案**：对配置类端点增加简单内存缓存（带 TTL），在写操作后主动失效缓存。适合用 `node-cache` 或自实现 Map + 时间戳。

---

## 四、执行优先级总表

| 编号 | 问题 | 优先级 | 预估工作量 | 影响范围 |
|------|------|--------|-----------|---------|
| P1-1 | 全量加载 + 内存分页 | 🔴 高 | 2-3天 | 生产性能；前端分页触点 2026-04-30 已核对完成，剩余为后端/DB 证据 |
| P1-2 | 缺少认证授权 | 🔴 高 | 1-2天 | 数据安全；前端 `x-api-key` header 2026-04-30 已完成，服务端覆盖另验 |
| P1-3 | 数据库缺少索引 | 🔴 高 | 0.5天 | 查询性能 |
| P1-4 | CORS 配置矛盾 | 🔴 高 | 0.5天 | 跨域可用性 |
| P2-1 | 兼容层命名混乱 | 🟡 中 | 3-5天 | 可维护性 |
| P2-2 | PlainRecord 滥用 | 🟡 中 | 持续迭代 | 类型安全 |
| P2-3 | 前端请求竞态 | 🟡 中 | 已完成 | `fetchOrders` AbortController + cancel handling 已落地 |
| P2-4 | API 响应格式不一致 | 🟡 中 | 前端兼容已完成 | API 契约统一仍属后端/契约治理 |
| P2-5 | OrderItem 字段语义 | 🟡 中 | 1天+迁移 | 代码可读性 |
| P3-1 | 缺结构化日志 | 🟢 低 | 1天 | 可观测性 |
| P3-2 | 状态转换 API 不统一 | 🟢 低 | 1天 | API 一致性 |
| P3-3 | 验证逻辑分散 | 🟢 低 | 持续迭代 | 可维护性 |
| P3-4 | 缺少缓存策略 | 🟢 低 | 2天 | 读取性能 |

---

## 五、与现有重构计划的关系

本文档的问题均为当前代码实际存在的问题，与 `MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md` 中的结构治理方向互补：

- **P1-1（分页性能）**：前端分页调用与状态维护已完成；若继续推进，只新增后端数据库级分页/索引验证任务
- **P1-2（认证）**：前端 `x-api-key` header 已完成；若继续推进，只新增服务端认证覆盖/发布配置验证任务
- **P1-3（索引）**：现有重构计划未覆盖，建议在 WEEK1 或 WEEK2 阶段完成
- **P2-1（兼容层）**：已有 `COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md`，按该文档执行
- **P2-2（类型安全）**：已有 `docs/archive/backend-ts/BACKEND_TYPESCRIPT_MIGRATION_STRATEGY_2026-03-13.md`，按该历史迁移文档执行

2026-04-30 前端结论：不要从本旧计划直接开启新的前端实现。若后续需要执行，应把 P1-1/P1-2/P1-3/P1-4 拆成后端、配置或发布验证任务，并以新的失败证据/测试用例重新立项。
