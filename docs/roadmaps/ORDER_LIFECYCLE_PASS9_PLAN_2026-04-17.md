# Order Lifecycle Pass 9 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass9`
> 范围：继续收口 `order.service.ts` 中剩余的服务支持逻辑，优先提炼 order number / duplicate / idempotency 相关 helper，但不改变 API contract 或业务语义。

---

## 1. 背景

订单域已经完成：
- query helper
- create helper
- update helper
- delete helper
- arrive/bulk-arrive helper
- stockIn helper

当前 `order.service.ts` 中剩余的明显块，主要集中在：
- order number allocation
- unique order_no assertion
- duplicate auto-order lookup
- idempotency key reserve/release/sync
- `getAllOrders` 的读路径日志清理

这些逻辑虽然不像 create/update 那样庞大，但仍然让 `order.service.ts` 保留大量服务支持性细节。

---

## 2. 本轮目标

优先把 `OrderService` 中支持性 orchestration 提炼出去，让 service 主体更聚焦于真正的 use-case 入口。

本轮优先顺序：
1. order number / duplicate / idempotency helper 提炼
2. 如果第一刀顺利，再判断是否继续处理 `getAllOrders`

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / idempotency 的业务语义
3. 不改 manual/auto order number 生成规则
4. 不引入新依赖
5. 不同时改 create/update 主流程 helper 的语义

---

## 4. 推荐切口

建议新增一个 support helper 模块，例如：
- `server/services/orders/order.service.support.ts`

优先承接：
- `allocateNextManualOrderNo`
- `allocateNextAutoOrderNo`
- `assertUniqueOrderNo`
- `findDuplicateAutoOrder`
- `reserveIdempotencyKey`
- `releaseIdempotencyKeys`
- `syncActiveIdempotencyKey`

---

## 5. 完成标准

至少满足：

1. 上述支持性逻辑不再直接内联在 `order.service.ts`
2. 行为不变
3. 定向测试继续通过
4. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/order-service.test.ts
npm test -- tests/order-routes.test.ts
npm test -- tests/governance-boundary-guard.test.ts
npm test
npm run build
```
