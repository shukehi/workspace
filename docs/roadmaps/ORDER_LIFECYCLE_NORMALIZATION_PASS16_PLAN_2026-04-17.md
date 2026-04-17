# Order Lifecycle Normalization Pass 16 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass16`
> 范围：在 normalization 阶段继续提炼 lifecycle runtime-deps 的共享 contract，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 create / update / stock-in 三条路径虽然已经大量归一，但 deps type 仍在 helper 文件中重复组合：
- `OrderLifecycleDepsCore`
- `OrderUniqueOrderNoBinding`
- `OrderDuplicateAutoBinding`
- `OrderIdempotencyReserveBinding`
- `OrderIdempotencyMutationBindings`
- `OrderByIdWithItemsBinding`

这些组合关系已经稳定，适合继续抽为更高层的 shared runtime-deps contracts。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 在 `order.service.contracts.ts` 中新增更高层 runtime-deps alias
- 让 create / update / stock-in helper 直接复用这些 alias

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 runtime 行为
3. 不重写 helper 业务逻辑
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`
- `server/services/orders/order.stockin.ts`

目标：
- 把 lifecycle runtime deps 的常见组合正式命名
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. create / update / stock-in 不再重复组合相同 runtime-deps contract fragment
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
