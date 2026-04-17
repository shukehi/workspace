# Order Lifecycle Normalization Pass 8 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass8`
> 范围：在 normalization 阶段继续统一 create/update 的 shared binding types，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- create/update shared lifecycle bindings 归一
- read shared bindings 归一
- query shared bindings 归一
- create / update / stock-in dependency assembly 已分别归一

当前最自然的下一刀是：
- create / update helper 内部仍重复定义 shared binding types

这些类型语义已经稳定，适合继续把“运行时 wiring 已统一”的成果推进到“类型契约也统一”。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 让 `order.service.create.ts` / `order.service.update.ts` 复用 support 层的 shared lifecycle binding contract
- 减少 helper 间的重复类型定义

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / idempotency / retry 语义
3. 不重写 read/query/stock-in 行为
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`

目标：
- 用 `OrderLifecycleServiceBindings` 派生 create/update 的 binding 类型
- 保持 runtime 行为不变，只统一 shared contract surface

---

## 5. 完成标准

至少满足：

1. create/update 不再各自维护重复的 shared binding 类型定义
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
