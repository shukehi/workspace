# Order Lifecycle Tail Reassessment Pass 3 (2026-04-20)

> 状态：当前执行计划。
> 分支：`main`
> 范围：在确认 stock-in builder 仍属于 forwarding-only seam 后，退掉这一层纯转发组合，而不改变 stock-in 行为。

---

## 1. 背景

在 pass 2 退掉 lifecycle forwarding builder 后，订单域还剩一个同等级的小 seam：
- `buildStockInOrderLifecycleDeps`

它主要只负责：
- 注入 transactionFactory
- 注入 findOrderByIdWithItems
- 转发 stock-in 所需服务与状态依赖

实际业务逻辑不在 builder 中，因此仍属于可 review、可验证的 forwarding-only layer。

---

## 2. 本轮目标

只做一个小切口：
- 移除 `buildStockInOrderLifecycleDeps`
- 让 `order.service.ts` 直接声明 stock-in canonical deps object

---

## 3. 本轮不做的事

1. 不改 stock-in 业务行为
2. 不改 receipt 创建 / order 完成语义
3. 不改 create/update lifecycle 结构
4. 不做额外 type dedupe 或 regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.stockin.ts`
- `server/services/orders/order.service.ts`
- `docs/README.md`

目标：
- retire forwarding-only stock-in builder layer
- 让 stock-in composition ownership 继续向 `order.service.ts` 收束

---

## 5. 完成标准

至少满足：

1. `buildStockInOrderLifecycleDeps` 被移除
2. `order.service.ts` 直接构造 stock-in deps object
3. stock-in 行为不变
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
