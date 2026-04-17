# Order Lifecycle Normalization Pass 24 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass24`
> 范围：在 normalization 阶段继续收束 contracts 层的 read/query alias 命名，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层在 read/query 侧仍有几层一跳转 alias：
- `OrderReadItemDeps = OrderReadSurfaceBindings`
- `OrderPaginatedQueryDeps = OrderQuerySurfaceBindings`
- `OrderQueryBindings = OrderPaginatedQueryDeps`

这些 alias 目前没有增加语义，只增加命名层级。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 read/query 侧一跳转 alias
- 让 helper 直接依赖 canonical alias

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/query runtime 行为
3. 不重写 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.query.ts`

目标：
- 把 read/query 的 canonical alias 只保留一层
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. read/query helper 不再依赖纯一跳转 alias
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
