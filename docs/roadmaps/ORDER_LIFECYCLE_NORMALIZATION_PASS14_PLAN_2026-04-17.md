# Order Lifecycle Normalization Pass 14 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass14`
> 范围：在 normalization 阶段继续统一 lifecycle deps 的 shared contract fragments，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- shared lifecycle bindings
- shared binding types
- shared read/query/lookup contracts
- duplicate / unique / idempotency fragment contracts
- shared core lifecycle fragment

当前最自然的下一刀是：
- transaction / get-by-id / persistence 这组三类 deps contract 仍在 create/update/stock-in 中分别组合

这些 fragment 已经稳定，适合继续把更高层的 deps contract 组合上提一层。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 在 `order.service.contracts.ts` 中新增 lifecycle deps 的 shared composite contracts
- 让 create/update/stock-in 的 deps typing 复用这些更高层 contract fragment

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 runtime 行为
3. 不重写 helper 的业务逻辑
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.update.ts`
- `server/services/orders/order.stockin.ts`

目标：
- 把 transaction / by-id / persistence 这组 shared deps contract 再向上组合一层
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. lifecycle helpers 不再各自重复组合同一组 deps contract fragment
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
