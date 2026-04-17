# Order Lifecycle Pass 10 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass10`
> 范围：继续收口 `order.service.ts` 中剩余的 read-path / service-surface 支撑逻辑，优先处理 `getAllOrders`，但不改变 API contract 或业务语义。

---

## 1. 背景

订单域已经完成：
- query helper
- create helper
- update helper
- delete helper
- arrive/bulk-arrive helper
- stockIn helper
- support helper

当前 `order.service.ts` 中剩余的明显块，主要集中在：
- `getAllOrders` 的 where 组装
- invalid order logging path
- 全量结果序列化读路径

这些逻辑不再像 lifecycle block 那样大，但仍然让 service 主体保留一段读路径支撑细节。

---

## 2. 本轮目标

优先把 `OrderService` 中剩余的低风险 read-path/support 逻辑再提炼一刀，让 service 主体进一步聚焦于 use-case 入口。

本轮优先顺序：
1. `getAllOrders` read helper 提炼
2. 如果这一刀顺利，再判断是否还有更小的 read/surface 切口

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改日志语义
3. 不改 query / pagination contract
4. 不引入新依赖
5. 不同时做更深的 create/update normalization

---

## 4. 推荐切口

建议新增一个 read helper 模块，例如：
- `server/services/orders/order.service.read.ts`

优先承接：
- `getAllOrders`
- invalid `created_at` log normalization path

---

## 5. 完成标准

至少满足：

1. `getAllOrders` 不再直接内联在 `order.service.ts`
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
