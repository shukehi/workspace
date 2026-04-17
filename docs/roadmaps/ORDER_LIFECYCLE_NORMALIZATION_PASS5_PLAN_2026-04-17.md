# Order Lifecycle Normalization Pass 5 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass5`
> 范围：在 normalization 阶段继续统一 `createOrder` / `updateOrder` 的 shared lifecycle bindings，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- `updateOrder` dependency assembly 归一
- `createOrder` dependency assembly 归一
- `stockInOrder` dependency assembly 归一

当前最自然的下一刀是：
- `createOrder` / `updateOrder` 之间重复的 service-bound support bindings

两条路径都需要类似依赖：
- `getOrderById`
- `assertUniqueOrderNo`
- `findDuplicateAutoOrder`
- `reserveIdempotencyKey`
- `releaseIdempotencyKeys`
- `syncActiveIdempotencyKey`

这些 wiring 语义已经稳定，适合做 shared binding normalization。

---

## 2. 本轮目标

继续做真正的 normalization，而不是再抽单个 wrapper：
- 在 support 层新增 shared lifecycle bindings builder
- 让 `order.service.ts` 的 create/update wiring 使用同一套 service-bound bindings 约定

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / idempotency / retry 语义
3. 不同时重写 stock-in / read / query 多条路径
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.support.ts`

新增：
- `buildOrderLifecycleBindings()`

目标：
- 把 create/update 共用的 service-bound support wiring 从 `order.service.ts` 中拿掉
- 保持 create/update lifecycle helper 和行为不变

---

## 5. 完成标准

至少满足：

1. `createOrder` / `updateOrder` 不再直接重复内联大块 shared support bindings
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
