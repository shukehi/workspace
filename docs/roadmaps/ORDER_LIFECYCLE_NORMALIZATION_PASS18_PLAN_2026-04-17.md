# Order Lifecycle Normalization Pass 18 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass18`
> 范围：在 normalization 阶段继续收束 contracts 层命名，优先处理 lifecycle binding alias consolidation，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层已经积累出一组稳定 fragment：
- core lifecycle fragments
- mutable lifecycle fragments
- allocation fragments
- read/query surfaces

但 helper 侧仍保留少量“组合即定义”的命名：
- support 对 mutable + allocation 的组合
- create 对 core + allocation 的组合

这些组合已稳定，适合继续正式命名，而不是让 helper 文件继续承载组合语义。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 为稳定的 lifecycle binding 组合提供正式 alias
- 让 support / create helper 直接复用 contracts 层 alias

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
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.service.create.ts`

目标：
- 把 helper 已稳定依赖的 binding 组合上提为正式 alias
- 保持 runtime 行为不变

---

## 5. 完成标准

至少满足：

1. support/create 不再各自通过组合表达同一组稳定 lifecycle binding alias
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
