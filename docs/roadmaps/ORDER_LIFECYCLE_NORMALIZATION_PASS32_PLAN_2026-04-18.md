# Order Lifecycle Normalization Pass 32 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass32`
> 范围：在 normalization 阶段继续收束 stock-in 专属的 service contract 定义，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 shared contracts 层里还保留一个主要只服务 stock-in helper 的 alias：
- `OrderStockInServiceDeps`

它描述的是 stock-in helper 自己的 service/runtime service 依赖面：
- `inventoryReceiptService`
- `MissingMaterialError`
- `resolveOrderedQuantity`
- `ReceivedQuantityExceededError`
- `normalizeOrderRemark`

这一组 shape 目前并没有被多个 helper 共享，更接近 `order.stockin.ts` 的本地依赖面。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 把 `OrderStockInServiceDeps` 从 shared contracts 层移出
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
- stock-in 专属 service shape 回到 stock-in helper 模块内

---

## 5. 完成标准

至少满足：

1. `OrderStockInServiceDeps` 不再存在于 shared contracts 层
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
