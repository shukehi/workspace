# Order Lifecycle Normalization Pass 26 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass26`
> 范围：在 normalization 阶段继续收束 helper-facing alias 命名，但不改变 API contract 或业务语义。

---

## 1. 背景

当前订单域 contracts / helper 层里仍保留几组纯转发 alias：
- `OrderQueryBindings = OrderQuerySurfaceBindings`
- `CreateOrderLifecycleBindings = OrderLifecycleCreateBindings`
- `UpdateOrderLifecycleBindings = OrderLifecycleMutableBindings`
- `StockInOrderLifecycleBindings = OrderByIdBinding`

这些 alias 当前没有提供额外语义，只增加了 helper 文件的类型层级。

---

## 2. 本轮目标

继续做 contracts/helper-layer normalization：
- 去掉纯转发型 helper-facing alias
- 让 helper 直接依赖 canonical contract

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 create/update/query/stock-in runtime 行为
3. 不重写 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`
- `server/services/orders/order.service.query.ts`
- `server/services/orders/order.stockin.ts`

目标：
- helper 文件直接依赖 canonical lifecycle / query / lookup contract
- 只移除没有新增语义的转发 alias

---

## 5. 完成标准

至少满足：

1. helper 不再依赖上述纯转发 alias
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
