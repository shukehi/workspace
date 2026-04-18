# Order Lifecycle Normalization Pass 39 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass39`
> 范围：在 normalization 阶段继续收束 create/support 侧的 allocation alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留一个主要只服务 create/support helper 的 alias：
- `OrderAllocationBindings`

它当前只是把两条分配函数签名组合起来：
- `allocateNextManualOrderNo`
- `allocateNextAutoOrderNo`

这更接近 create/support 局部依赖面，而不是需要单独保留的共享语义层。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉 `OrderAllocationBindings`
- 让 create/support helper 直接依赖 explicit allocation signatures

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 create/support runtime 行为
3. 不重写 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.create.ts`
- `server/services/orders/order.service.support.ts`

目标：
- create/support helper 直接写出 manual/auto 分配函数签名
- 只移除没有新增语义的 allocation alias

---

## 5. 完成标准

至少满足：

1. `OrderAllocationBindings` 不再存在
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
