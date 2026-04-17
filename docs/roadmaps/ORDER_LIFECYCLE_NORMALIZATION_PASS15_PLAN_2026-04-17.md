# Order Lifecycle Normalization Pass 15 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass15`
> 范围：在 normalization 阶段继续整理 contracts 层的命名与组合别名，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- shared lifecycle bindings
- shared binding types
- shared read/query/lookup contracts
- duplicate / unique / idempotency fragments
- lifecycle deps core / persistence contracts

当前 contracts 层已经积累了多组稳定 fragment，最自然的下一刀是：
- 给常见组合提供更高层 alias，减少 helper 文件内重复的交叉组合表达

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 在 `order.service.contracts.ts` 中新增更高层 shared contract aliases
- 让 read/query/update helper 直接复用这些 alias，而不是在各自文件里重复拼接相同组合

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 runtime 行为
3. 不重写 helper 业务逻辑
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.query.ts`
- `server/services/orders/order.service.update.ts`

目标：
- 把 contracts 层里已经稳定的常见组合正式命名
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. 受影响 helper 不再重复拼接同一组 shared contract fragment
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
