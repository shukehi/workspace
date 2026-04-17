# Order Lifecycle Normalization Pass 21 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass21`
> 范围：在 normalization 阶段继续收束 contracts 层的 lifecycle alias 命名，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层已经积累出多组稳定 alias：
- `OrderLifecycleSupportBindings`
- `OrderLifecycleCoreRuntimeBindings`
- `OrderLifecycleMutableRuntimeBindings`
- `OrderLifecycleCreateBindings`

但 helper 侧仍保留一处明显重复的命名层：
- support 文件里重复导出 `OrderLifecycleServiceBindings`
- create runtime deps 仍通过内联交叉组合来表达 allocation + core runtime

这些命名关系已经稳定，适合继续收束，让 alias 层次更清楚。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 提炼 `OrderLifecycleCreateRuntimeBindings`
- 去掉 support 层多余的中转 alias
- 让 helper 直接依赖 contracts 层正式命名的 alias

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
- 把 create runtime deps 的稳定组合正式命名
- 删除 support 层不再需要的别名中间层
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. support/create 不再重复表达同一组稳定 alias 关系
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
