# Order Lifecycle Normalization Pass 23 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass23`
> 范围：在 normalization 阶段继续收束 stock-in helper 的 service/guard deps contract，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 `order.stockin.ts` 已经拥有：
- runtime-deps alias
- by-id / by-id-with-items contract
- status guard related contract

但文件内仍然保留一组本地 `StockInDeps` 结构，以及多处 `Pick<...>` 组合。
这些 service deps 语义已经稳定，适合继续上提到 contracts 层，减少 stock-in helper 内部的局部类型重复。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 在 `order.service.contracts.ts` 中新增 stock-in service/guard deps alias
- 让 `order.stockin.ts` 直接复用这些 alias

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 stock-in runtime 行为
3. 不重写 receipt / inventory side effects
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.stockin.ts`

目标：
- 把 stock-in service deps 与 status guard deps 的稳定 contract 正式命名
- 保持 runtime helper 行为不变

---

## 5. 完成标准

至少满足：

1. `order.stockin.ts` 不再本地维护重复的 service deps contract 片段
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
