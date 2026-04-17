# Order Lifecycle Normalization Pass 7 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass7`
> 范围：在 normalization 阶段继续统一 paginated query 侧的 shared bindings，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- create/update shared lifecycle bindings 归一
- list/single read shared bindings 归一
- create / update / stock-in 的 dependency assembly 已分别归一

当前最自然的下一刀是：
- paginated query 侧的 shared bindings

因为 `getPaginatedOrders` 仍然直接拼装：
- `serializeOrder`
- `buildOrderSummary`
- `buildOrderFacets`

这些 wiring 语义已经稳定，适合做 paginated query-surface normalization。

---

## 2. 本轮目标

继续做真正的 normalization：
- 在 `order.service.query.ts` 中新增 shared query bindings builder
- 让 `order.service.ts` 的 paginated query wiring 使用统一的 query-surface 约定

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 pagination / summary / facets 语义
3. 不同时重写 read / lifecycle 多条路径
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.query.ts`

新增：
- `buildOrderQueryBindings()`

目标：
- 把 `getPaginatedOrders` 共用的 query-surface bindings 从 `order.service.ts` 中拿掉
- 保持 query helper 行为不变

---

## 5. 完成标准

至少满足：

1. `getPaginatedOrders` 不再直接内联 query bindings
2. 行为不变
3. 定向测试继续通过
4. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.ts tests/order-routes.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
