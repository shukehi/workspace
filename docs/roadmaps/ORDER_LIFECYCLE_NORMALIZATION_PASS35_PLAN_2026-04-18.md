# Order Lifecycle Normalization Pass 35 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass35`
> 范围：在 normalization 阶段继续收束 stock-in 专属的 status/guard contract 定义，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 shared contracts 层里还保留两组主要只服务 stock-in helper 的类型：
- `OrderStatusNormalizerBinding`
- `OrderStatusTransitionErrorBinding`

它们当前只被 `order.stockin.ts` 使用，更接近 stock-in helper 的本地依赖面，而不是跨 helper 共享 contract。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 把 stock-in 专属的 status/guard contract 从 shared contracts 层移出
- 将其下沉为 `order.stockin.ts` 内的本地 helper type

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 stock-in runtime 行为
3. 不重写 stock-in 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.stockin.ts`

目标：
- shared contracts 只保留真正跨 helper 复用的 contract
- stock-in 专属 status/guard shape 回到 stock-in helper 模块内

---

## 5. 完成标准

至少满足：

1. `OrderStatusNormalizerBinding` / `OrderStatusTransitionErrorBinding` 不再存在于 shared contracts 层
2. stock-in helper 行为不变
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
