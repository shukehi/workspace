# Order Lifecycle Normalization Pass 28 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass28`
> 范围：在 normalization 阶段继续收束 contracts 层的单用途 / 未使用 composite alias，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 contracts 层仍保留少量单用途或未使用的 composite alias：
- `OrderReadBindings`
- `OrderLifecycleDepsPersistence`
- `OrderLifecycleDepsCore`

其中：
- `OrderReadBindings` 只服务 read helper builder 参数
- `OrderLifecycleDepsPersistence` 只服务 update helper deps type
- `OrderLifecycleDepsCore` 已无实际引用

这些名字当前更像额外中间层，而不是稳定独立语义面。

---

## 2. 本轮目标

继续做 contracts-layer normalization：
- 去掉单用途 / 未使用 composite alias
- 让 read/update helper 直接依赖 canonical contract fragment 组合

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/update runtime 行为
3. 不重写 helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.contracts.ts`
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.update.ts`

目标：
- read/update helper typing 直接依赖真正的 canonical fragment 组合
- 只移除没有新增语义的 composite alias

---

## 5. 完成标准

至少满足：

1. `OrderReadBindings` / `OrderLifecycleDepsPersistence` / `OrderLifecycleDepsCore` 不再存在
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
