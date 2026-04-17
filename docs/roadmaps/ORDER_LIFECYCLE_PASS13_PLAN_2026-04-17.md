# Order Lifecycle Pass 13 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass13`
> 范围：继续收口 `order.service.ts` 中剩余的 stock-in entry surface，优先处理 `stockInOrder` 入口 wrapper，但不改变 API contract 或业务语义。

---

## 1. 背景

订单域已经完成：
- query helper
- read helper（list + single）
- create helper
- update helper
- delete helper
- arrive / bulk-arrive helper（含 entry wrapper）
- stockIn helper（lifecycle）
- support helper

当前 `order.service.ts` 中剩余的明显小块之一是：
- `stockInOrder`

它已经依赖 `order.stockin.ts`，但入口 wrapper 仍直接留在 service 内。

---

## 2. 本轮目标

优先把剩余 stock-in entry surface 再提炼一刀，让 `order.service.ts` 进一步聚焦于 service 入口壳。

本轮优先顺序：
1. `stockInOrder` helper 提炼
2. 如果这一刀顺利，再判断是否还有更小的 lifecycle / service-surface 切口

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 stock-in 语义
3. 不改 receipt / inventory side effects
4. 不引入新依赖
5. 不同时做更深的 create/update normalization

---

## 4. 推荐切口

沿用：
- `server/services/orders/order.stockin.ts`

优先新增：
- `stockInOrderResult`

---

## 5. 完成标准

至少满足：

1. `stockInOrder` 不再直接内联在 `order.service.ts`
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
