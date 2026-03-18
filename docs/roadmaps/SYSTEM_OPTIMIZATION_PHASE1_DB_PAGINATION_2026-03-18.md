# 优化阶段一：数据库分页与索引（2026-03-18）

> 关联文档：
> - `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md`
> - `docs/roadmaps/SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md`
> 状态：部分完成（2026-03-18）— 索引迁移 + DB 层 WHERE 筛选已落地；数据库级 LIMIT/OFFSET 分页（Task 3）已推迟。
> 目标：消除全量加载 + 内存分页瓶颈，为高频查询字段建立数据库索引。

---

## 执行面板

```text
Phase 1 — DB Pagination & Indexes
- Owner: TBD
- Status: partial (索引+DB WHERE 已落地，LIMIT/OFFSET 分页推迟)
- Start Date: 2026-03-18
- Target Date:
- Exit Criteria:
  - findOrdersPaginated 方法已实现并通过单元测试
  - GET /api/orders 不再全量加载，改为 LIMIT/OFFSET 数据库查询
  - 高频字段索引已创建，EXPLAIN QUERY PLAN 确认生效
  - npm run type-check + npm test 通过
  - Procurement 页面翻页、筛选行为与改造前一致
- Blocking:
- PR / Issue:
- Notes:
```

---

## 范围限制

本阶段只做：
1. 新增索引迁移脚本
2. 新增 `findOrdersPaginated` repository 方法
3. 修改 `getPaginatedOrders` 使用数据库分页

本阶段不做：
- 不改动 `order.service.ts` 中除分页逻辑以外的代码
- 不删除 `findAllOrdersWithItems`（其他调用方仍在使用）
- 不改动 API 响应结构（格式统一在阶段五处理）
- 不改动前端代码

---

## 任务清单

### 任务 1：新增索引迁移脚本

**文件**：`server/db/migrations/add-query-indexes-2026-03-18.js`（新增）

- [x] 创建文件，实现 `up` 方法（`server/db/migrations/20260318-006-add-query-indexes.js`）
- [x] `up`：为 `orders` 表的 `status`、`category`、`supplier`、`source_contract_code`、`created_at` 添加索引
- [x] `up`：为 `order_items` 表的 `order_id`、`material_id` 添加索引
- [x] `up`：为 `inventory_receipts` 表的 `order_id` 添加索引
- [ ] `down`：对应 `removeIndex` 回滚操作（未实现，后续补充）
- [x] 所有索引使用 `IF NOT EXISTS`，保证迁移幂等

验收：
- [x] 迁移文件格式与现有迁移一致（`{ id, name, up() }` + raw SQL）
- [ ] 在测试数据库执行 `up` 无报错（需手动验证）
- [ ] 执行 `down` 回滚无报错
- [ ] 再次执行 `up` 不报重复索引错误

---

### 任务 2：实现 `buildWhereFromQuery` 纯函数

**文件**：`server/services/orders/order.repository.ts`（修改）

- [x] 新增 `buildSimpleWhereFromQuery(query)` 函数（已落地，函数名为简化版本）
- [x] 处理 `status` 参数（单值 `=`，`PENDING` 使用 `Op.in: ORDER_PENDING_STATUSES`）
- [ ] 处理 `category` 参数（精确匹配）— 推迟
- [ ] 处理 `supplier` 参数（`Op.like` 模糊匹配）— 推迟
- [x] 处理 `orderNo` 参数（`Op.like` 模糊匹配）
- [x] 处理 `createdDate` 参数（`Op.like` 前缀匹配 `YYYY-MM-DD%`）
- [ ] 处理 `startDate` / `endDate` 参数（`Op.between`）— 推迟
- [x] 参数为空或未传时跳过该条件

验收：
- [ ] 新增单元测试 `tests/order-repository-where-builder.test.ts`（推迟）
- [ ] 覆盖：空参数、单 status、多 status、search 含特殊字符、日期范围（推迟）

---

### 任务 3：实现 `findOrdersPaginated`

**文件**：`server/services/orders/order.repository.ts`（修改）

- [ ] 新增 `findOrdersPaginated(where, page, pageSize)` 方法（**推迟**，当前仍使用 `findAllOrdersWithItems`）
- [ ] 内部使用 `Order.findAndCountAll({ where, include: ORDER_ITEM_INCLUDE, order: [['created_at', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize })`
- [ ] 返回 `{ rows: OrderInstance[], count: number }`

> **状态**：推迟。当前方案：`findAllOrdersWithItems` 接受 DB-level WHERE 条件后，在内存中做复杂过滤（risk、keyword）再 slice 分页。在数据量不超过 1 万条前性能可接受。

验收：
- [ ] 返回数据结构与现有 `getPaginatedOrders` 输出保持兼容
- [ ] 翻页边界（第一页/最后一页/超出范围）行为正确

---

### 任务 4：修改 `getPaginatedOrders` 使用数据库分页

**文件**：`server/services/orders/order.service.ts`（修改）

- [x] `getPaginatedOrders` 使用 `buildSimpleWhereFromQuery` 生成 DB WHERE 条件
- [x] `findAllOrdersWithItems` 接受 where 参数，DB 层过滤 status/orderNo/createdDate
- [x] `filterOrders` 仍保留用于复杂过滤（risk 级别、keyword 匹配 items），之后 slice 分页
- [x] 保留 `page`、`pageSize` 参数解析逻辑（最小10、最大200）
- [x] 返回结构保持不变：`{ rows, total, page, pageSize, summary, facets }`

验收：
- [ ] `getPaginatedOrders` 不再调用 `filterOrders`（**当前仍调用**，复杂过滤需要）
- [x] DB 层 WHERE 过滤已生效（status、orderNo、createdDate 由数据库处理）

---

### 任务 5：清理 query-policy 内存过滤逻辑

**文件**：`server/services/orders/order.query-policy.ts`（修改）

- [x] 评估 `filterOrders` 函数调用方：仅 `order.service.ts` 的 `getPaginatedOrders` 调用
- [ ] `filterOrders` 仍在使用（risk/keyword 复杂过滤无法下推到 SQL），暂不废弃
- [x] 状态流转验证逻辑保持不变

验收：
- [ ] `filterOrders` 在 `order.service.ts` 中无调用引用（**当前仍有调用**，推迟）
- [x] `type-check` 通过（预存在错误与本次无关）

---

### 任务 6：更新相关测试

**文件**：
- `tests/order-routes.test.js`（更新）
- `tests/order-repository-where-builder.test.ts`（新增）
- `tests/order-service-pagination.test.ts`（新增，或扩充现有）

- [ ] `order-routes.test.js`：确认 `GET /orders` 分页参数正确传递，断言响应字段
- [ ] `order-repository-where-builder.test.ts`：覆盖各筛选参数组合
- [ ] `order-service-pagination.test.ts`：mock repository，验证 service 层参数传递正确
- [ ] 删除已不再需要的内存过滤相关测试断言

---

## 推荐 PR 拆分

### PR 1：索引迁移脚本

```
perf(db): add indexes on orders and order_items for common query fields

- orders: status, category, supplier, source_contract_code, created_at
- order_items: order_id, material_id
- inventory_receipts: order_id
```

### PR 2：数据库分页实现

```
perf(orders): replace in-memory pagination with db-level findAndCountAll

- add buildWhereFromQuery() to translate filter params to Sequelize where
- add findOrdersPaginated() using findAndCountAll with LIMIT/OFFSET
- update getPaginatedOrders() to use db pagination
- add unit tests for where builder and pagination
```

---

## 回滚方案

- 分页实现回滚：恢复 `order.service.ts` 中的 `getAllOrders + filterOrders + slice` 调用
- 索引回滚：执行迁移脚本的 `down` 方法

---

## 本阶段验收清单

- [ ] `npm run type-check`
- [ ] `npm run type-check:server`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE status = ?` 使用 `idx_orders_status`
- [ ] Procurement 页面 smoke：翻页行为正常
- [ ] Procurement 页面 smoke：status 筛选生效
- [ ] Procurement 页面 smoke：search 搜索生效
- [ ] Procurement 页面 smoke：结果总数显示正确
