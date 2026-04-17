# Order Lifecycle Normalization Pass 10 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass10`
> 范围：在 normalization 阶段继续统一 read/support/stock-in 之间的 shared lookup contract typing，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- shared lifecycle bindings
- shared binding types
- shared read bindings
- shared query bindings
- shared read/query contracts

当前最自然的下一刀是：
- read/support/stock-in 之间仍重复的 lookup contract typing

这些路径都依赖：
- `getOrderById`
- `findOrderByIdWithItems`

这类 contract 已经稳定，适合继续统一。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 在 `order.service.contracts.ts` 中新增 shared lookup contracts
- 让 read/support/stock-in 绑定类型复用同一套 lookup contract typing

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/stock-in/support 的运行行为
3. 不重写 create/update/query 运行逻辑
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`

新增：
- shared lookup contracts

目标：
- 把 `getOrderById` / `findOrderByIdWithItems` 的 shared typing 从 helper 各自文件中拿出来
- 保持 runtime helper 行为不变

---

## 5. 完成标准

至少满足：

1. read/support/stock-in 不再各自维护重复的 shared lookup contract typing
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
