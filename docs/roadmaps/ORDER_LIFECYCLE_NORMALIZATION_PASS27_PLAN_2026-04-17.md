# Order Lifecycle Normalization Pass 27 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass27`
> 范围：在 normalization 阶段继续收束 contracts 层的单用途 alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留少量单用途 alias：
- `OrderLifecycleSupportBindings`
- `OrderStockInRuntimeBindings`

它们当前只服务单一 helper surface，语义增量很小，已经接近“额外命名层”。

同时，`order.service.update.ts` 还保留了一个已不再使用的 contracts import。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 support / stock-in 侧单用途 alias
- 清理因此暴露出来的冗余 type import

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 support / stock-in runtime 行为
3. 不重写 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.stockin.ts`
- `server/services/orders/order.service.update.ts`

目标：
- support / stock-in helper 直接依赖 canonical contract fragment
- 只移除没有新增语义的单用途 alias

---

## 5. 完成标准

至少满足：

1. support / stock-in 不再依赖上述单用途 alias
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
