# Order Lifecycle Normalization Pass 29 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass29`
> 范围：在 normalization 阶段继续收束 stock-in 侧的 helper/service alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留几组主要服务于 stock-in 的 alias：
- `OrderStatusGuardBindings`
- `OrderStockInHelperDeps`
- `OrderStockInServiceDeps`

这些名字目前主要用于单一 helper 模块，已经接近“stock-in 本地组合表达”的共享版本。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 stock-in 侧单用途 alias
- 让 stock-in helper 直接依赖 canonical contract fragment 组合

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
- stock-in helper 直接使用真正的 canonical fragment 组合
- 只移除没有新增语义的 stock-in-specific alias

---

## 5. 完成标准

至少满足：

1. stock-in helper 不再依赖上述 stock-in-specific alias
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
