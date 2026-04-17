# Order Lifecycle Normalization Pass 30 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass30`
> 范围：在 normalization 阶段继续收束 read/query 侧的 helper-specific surface alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留几组主要服务于 read/query helper 的 alias：
- `OrderReadSurfaceBindings`
- `OrderReadListDeps`
- `OrderQuerySurfaceBindings`

这些名字目前主要是对更基础 fragment 的重新包装：
- `OrderSerializationBindings`
- `OrderByIdWithItemsBinding`
- `OrderSummaryFacetBindings`

它们已经越来越接近 read/query helper 局部组合表达，而不是必须独立存在的共享契约面。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 read/query 侧 helper-specific surface alias
- 让 read/query helper 直接依赖 canonical contract fragment 组合

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/query runtime 行为
3. 不重写 read/query 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.query.ts`

目标：
- read/query helper 直接使用 serialization / by-id-with-items / summary-facet 这些 canonical fragment
- 只移除没有新增语义的 read/query-specific alias

---

## 5. 完成标准

至少满足：

1. read/query helper 不再依赖上述 helper-specific alias
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
