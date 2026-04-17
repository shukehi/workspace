# Order Lifecycle Normalization Pass 31 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass31`
> 范围：在 normalization 阶段继续收束 read helper 的单用途 list alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留一个主要只服务 read helper 的 alias：
- `OrderReadListDeps`

它当前只是把：
- `OrderSerializationBindings`
- `findAllOrdersWithItems`
- `normalizeOrderForLog`

组合成一个 read-list 局部类型面，语义增量已经很小。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 `OrderReadListDeps`
- 让 read helper 直接依赖 canonical fragment + 局部 list 函数字段

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read runtime 行为
3. 不重写 read helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`

目标：
- read helper 的 list path 直接使用 `OrderSerializationBindings`
- 只移除没有新增语义的 read-list alias

---

## 5. 完成标准

至少满足：

1. `OrderReadListDeps` 不再存在
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
