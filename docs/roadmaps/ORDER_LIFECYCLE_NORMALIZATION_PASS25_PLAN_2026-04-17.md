# Order Lifecycle Normalization Pass 25 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass25`
> 范围：在 normalization 阶段继续收束 contracts 层的 runtime alias 命名，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层里仍保留几组纯转发型 runtime alias：
- `OrderLifecycleCoreRuntimeBindings = OrderCoreLifecycleBindings`
- `OrderLifecycleMutableRuntimeBindings = OrderLifecycleMutableBindings`
- `OrderLifecycleCreateRuntimeBindings = OrderLifecycleCreateBindings`

这些 alias 当前没有提供额外语义，只增加了 helper 文件的类型层级。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉纯转发型 lifecycle runtime alias
- 让 create/update helper 直接依赖 canonical lifecycle binding contract

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 create/update runtime 行为
3. 不改 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`

目标：
- 只保留有真实语义的 lifecycle contract 名称
- 让 create/update 的 deps typing 直接对齐 canonical contract

---

## 5. 完成标准

至少满足：

1. create/update 不再依赖纯转发型 runtime alias
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
