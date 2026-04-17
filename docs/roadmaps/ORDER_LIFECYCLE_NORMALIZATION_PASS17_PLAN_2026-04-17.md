# Order Lifecycle Normalization Pass 17 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass17`
> 范围：在 normalization 阶段继续整理 contracts 层中 allocation 相关的 shared contract fragment，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 create / support 仍然通过各自局部定义重复表达：
- `allocateNextManualOrderNo`
- `allocateNextAutoOrderNo`

这些 allocation contract 已经稳定，适合继续上提到 contracts 层，让 create / support 复用统一的 allocation surface。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 在 `order.service.contracts.ts` 中新增 shared allocation contract fragment
- 让 support/create helper 复用它，而不是各自重述 allocation typing

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改手动/自动单号分配语义
3. 不改 runtime wiring
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.service.create.ts`

目标：
- 把 allocation contract 从 helper-local typing 上提到 shared contracts 层
- 保持 helper runtime 行为不变

---

## 5. 完成标准

至少满足：

1. support/create 不再各自维护 allocation typing 片段
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
