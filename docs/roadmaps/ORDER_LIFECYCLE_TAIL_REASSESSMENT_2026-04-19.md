# Order Lifecycle Tail Reassessment (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-tail-reassessment`
> 范围：重新盘点 `server/services/orders/` 在最新 `main` 上是否还存在真实、可 review、可验证的小 seam；如果存在，只落一刀最小 cleanup。

---

## 1. 背景

Inventory deeper partitioning 已进入边际收益下降阶段，因此需要回到订单域重新判断：
- 是否还有真正的小 seam
- 是否还能在不扩大风险的前提下继续收尾

当前复盘后确认仍有一个小切口：
- `order.service.read.ts`
- `order.service.query.ts`
- `order.service.ts`

其中 `buildOrderReadBindings` 与 `buildOrderQueryBindings` 只是纯转发 builder，未形成真正的独立 ownership 层。

---

## 2. 本轮目标

只做一个小切口：
- 退掉 read/query 两个纯转发 binding builder
- 让 `order.service.ts` 直接声明 canonical read/query deps object

---

## 3. 本轮不做的事

1. 不改 orders 行为
2. 不改 query/read 返回 contract
3. 不改 lifecycle create/update/stock-in 流程
4. 不做大范围 service regrouping
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.read.ts`
- `server/services/orders/order.service.query.ts`
- `server/services/orders/order.service.ts`
- `docs/README.md`

目标：
- retire forwarding-only builder layer
- 让 `order.service.ts` 直接拥有 read/query binding composition

---

## 5. 完成标准

至少满足：

1. `buildOrderReadBindings` 被移除
2. `buildOrderQueryBindings` 被移除
3. `order.service.ts` 直接构造 read/query deps object
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
