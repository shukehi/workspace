# Order Lifecycle Tail Reassessment Pass 2 (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-tail-reassessment`
> 范围：在确认 read/query forwarding builder 已退场后，再收掉 lifecycle forwarding builder 这一条独立小 seam，而不改变订单行为。

---

## 1. 背景

最新复盘后，订单域仍剩一个同级别的小 seam：
- `buildOrderLifecycleBindings` 只做纯 forwarding
- 实际 canonical composition 仍发生在 `order.service.ts`

这和上一刀 read/query builder 的性质一致，属于可 review、可验证的尾段清理。

---

## 2. 本轮目标

只做一个小切口：
- 移除 `buildOrderLifecycleBindings`
- 让 `order.service.ts` 直接声明 lifecycle canonical deps object

---

## 3. 本轮不做的事

1. 不改 create/update/stock-in 业务行为
2. 不改 lifecycle deps contract shape
3. 不改 repository / mapper / policy 层
4. 不做跨多个 helper 的 regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.support.ts`
- `server/services/orders/order.service.ts`
- `docs/README.md`

目标：
- retire forwarding-only lifecycle builder layer
- 让真正的 composition owner 直接持有 deps object

---

## 5. 完成标准

至少满足：

1. `buildOrderLifecycleBindings` 被移除
2. `order.service.ts` 直接构造 lifecycle deps object
3. 订单行为不变
4. 订单相关测试与全量门禁继续通过

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
