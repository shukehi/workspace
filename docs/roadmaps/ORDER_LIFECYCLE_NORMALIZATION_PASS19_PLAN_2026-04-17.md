# Order Lifecycle Normalization Pass 19 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass19`
> 范围：在 normalization 阶段继续收束 read/query helper 的 deps alias 命名，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层已经有：
- `OrderReadSurfaceBindings`
- `OrderQuerySurfaceBindings`
- `OrderSerializationBindings`
- `OrderSummaryFacetBindings`

但 read/query helper 入口仍直接在各自文件中内联 deps parameter shape。

这些 deps shape 已经稳定，适合继续正式命名，减少 helper 文件内对 shared contracts 的重复组合表达。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 在 `order.service.contracts.ts` 中新增 read/query deps alias
- 让 `order.service.read.ts` / `order.service.query.ts` 直接复用这些 alias

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/query runtime 行为
3. 不改 helper 内部算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.query.ts`

目标：
- 把 read/query helper 的 deps parameter shape 正式命名
- 保持 runtime helper 行为不变

---

## 5. 完成标准

至少满足：

1. read/query helper 不再直接内联 shared deps parameter shape
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
