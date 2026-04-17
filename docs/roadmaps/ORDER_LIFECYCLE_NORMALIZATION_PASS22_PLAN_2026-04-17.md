# Order Lifecycle Normalization Pass 22 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass22`
> 范围：在 normalization 阶段继续收束 contracts 层 alias 命名，优先消除当前完全等价的重复 alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层已经成型，但存在几组**语义相同、结构相同**的别名：
- `OrderCoreLifecycleBindings`
- `OrderLifecycleCoreRuntimeBindings`

以及由它们派生出的：
- `OrderLifecycleMutableBindings`
- `OrderLifecycleMutableRuntimeBindings`
- `OrderLifecycleCreateBindings`
- `OrderLifecycleCreateRuntimeBindings`

这些 pair 目前没有真实语义差异，继续并存只会增加理解成本。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 将完全等价的 alias 收束到单一来源
- 让 helper 只依赖一个清晰命名的 contracts-layer alias

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
- `server/services/orders/order.service.support.ts`

目标：
- 去掉 contracts 层完全等价的重复命名
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. 完全等价的 lifecycle alias 不再双重存在
2. helper 使用单一命名源
3. 行为不变
4. 定向测试继续通过
5. 全量门禁保持全绿

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
