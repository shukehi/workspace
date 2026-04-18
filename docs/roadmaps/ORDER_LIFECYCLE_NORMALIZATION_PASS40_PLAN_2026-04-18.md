# Order Lifecycle Normalization Pass 40 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass40`
> 范围：在 normalization 阶段继续收束 query helper 的单用途 summary/facet alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 shared contracts 层仍保留一个主要只服务 query helper 的 alias：
- `OrderSummaryFacetBindings`

它当前只是把两条 query 局部函数签名组合起来：
- `buildOrderSummary`
- `buildOrderFacets`

这更接近 query helper 的本地依赖面，而不是需要单独保留的共享语义层。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 `OrderSummaryFacetBindings`
- 让 query helper 直接依赖 explicit summary/facet function signatures

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 query runtime 行为
3. 不重写 query helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.query.ts`

目标：
- query helper 直接写出 summary/facet 函数签名
- 只移除没有新增语义的 query-summary alias

---

## 5. 完成标准

至少满足：

1. `OrderSummaryFacetBindings` 不再存在
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
