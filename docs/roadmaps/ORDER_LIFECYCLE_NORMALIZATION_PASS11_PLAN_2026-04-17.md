# Order Lifecycle Normalization Pass 11 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass11`
> 范围：在 normalization 阶段继续统一 lifecycle helper 的 shared dependency contracts，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- shared lifecycle bindings
- shared binding types
- shared read bindings
- shared query bindings
- shared read/query/lookup contracts

当前最自然的下一刀是：
- lifecycle helpers 仍然在各自文件里内联重复的 dependency contract 片段

这些 contract 片段主要围绕：
- transaction factory
- get-by-id
- serialize / item persistence

runtime wiring 已较稳定，适合继续把这些 shared dep contracts 上提到公共 contracts 层。

---

## 2. 本轮目标

继续做 contract / typing normalization：
- 在 `order.service.contracts.ts` 中新增更小粒度的 shared dependency contracts
- 让 create/update/stock-in helper 的 deps type 复用这些 shared contracts

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 create/update/stock-in 运行行为
3. 不重写 read/query/runtime wiring
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
- 把最明显重复的 deps typing 片段（transaction / by-id / serialization / persistence）统一出来
- 保持 helper 运行逻辑不变

---

## 5. 完成标准

至少满足：

1. lifecycle helpers 不再各自维护重复的 shared deps typing 片段
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
