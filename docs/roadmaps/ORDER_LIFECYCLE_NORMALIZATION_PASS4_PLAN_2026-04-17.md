# Order Lifecycle Normalization Pass 4 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass4`
> 范围：在 normalization 阶段继续收口 `stockInOrder` 的 dependency assembly，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- `updateOrder` dependency assembly 归一
- `createOrder` dependency assembly 归一

当前最自然的下一刀是：
- `stockInOrder` dependency assembly

因为它仍然在 `order.service.ts` 中直接拼装：
- transaction factory
- order lookup deps
- status / error deps
- inventoryReceiptService / quantity / remark deps
- refetch deps

---

## 2. 本轮目标

继续做真正的 normalization，而不是再抽 wrapper：
- 在 `order.stockin.ts` 中新增 stock-in lifecycle deps builder
- 让 `order.service.ts` 不再直接内联大块 stock-in dependency wiring

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 stock-in side effects / receipt semantics
3. 不同时重写其它 lifecycle path
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.stockin.ts`

新增：
- `buildStockInOrderLifecycleDeps()`

目标：
- 把 stock-in path 的 dependency assembly 从 `order.service.ts` 中拿掉
- 保持 `stockInOrderLifecycle()` 本身和现有行为不变

---

## 5. 完成标准

至少满足：

1. `stockInOrder` 不再直接内联大块 dependency assembly
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
