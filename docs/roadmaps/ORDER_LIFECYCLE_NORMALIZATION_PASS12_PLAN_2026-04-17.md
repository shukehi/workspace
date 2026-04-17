# Order Lifecycle Normalization Pass 12 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass12`
> 范围：在 normalization 阶段继续统一 lifecycle helpers 之间的 shared contract fragments，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- shared lifecycle bindings
- shared binding types
- shared read/query/lookup contracts
- shared transaction / persistence contract fragments

当前最自然的下一刀是：
- create/update 仍然通过 `OrderLifecycleServiceBindings` 间接拿 duplicate / unique / idempotency 相关 typing

这些 fragment 已经稳定，适合继续拆成更小的 shared contract pieces，降低 support 层作为类型中介的压力。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 在 `order.service.contracts.ts` 中新增 duplicate / unique / idempotency fragment types
- 让 create/update 的 binding types 直接复用这些 fragment，而不只依赖 `OrderLifecycleServiceBindings`

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / idempotency / retry 行为
3. 不重写 runtime wiring
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`

目标：
- 把 duplicate / unique / idempotency 的 shared typing 从 support 层再向 contracts 层上提一层
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. create/update 不再只通过 `OrderLifecycleServiceBindings` 间接复用 duplicate/unique/idempotency typing
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
