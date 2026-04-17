# Order Lifecycle Pass 8 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass8`
> 范围：继续收口 `order.service.ts` 中剩余的核心服务编排，优先处理 `updateOrder` 的更深层 transaction / fallback / idempotency orchestration。

---

## 1. 背景

订单域已经完成：
- query helper
- delete lifecycle helper
- arrive / bulk-arrive helper
- stockIn transaction orchestration helper
- createOrder orchestration helper

当前 `server/services/orders/order.service.ts` 中最明显剩余的大型块是：
- `updateOrder`

这段逻辑仍直接承载：
- transaction 开启/回滚
- duplicate / unique fallback
- order update + created_at update + items replace
- idempotency key 同步/释放
- persisted fallback

---

## 2. 本轮目标

优先把 `updateOrder` 的主要 orchestration 继续下沉，使 `order.service.ts` 更接近真正的 orchestration shell。

本轮优先顺序：
1. `updateOrder`
2. 如果这一刀顺利，再判断是否还需要更深的 lifecycle contract / error shaping 统一

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / fallback / idempotency 的业务语义
3. 不引入新依赖
4. 不同时再碰其它 lifecycle action

---

## 4. 推荐切口

建议继续围绕：
- `server/services/orders/order.service.update.ts`

优先新增：
- `updateOrder` lifecycle orchestration helper

让 `order.service.ts` 中的 `updateOrder()` 尽量只保留：
- 参数入口
- helper 调用
- 少量依赖拼装

---

## 5. 完成标准

至少满足：

1. `updateOrder()` 不再直接承载主要 transaction/fallback/idempotency orchestration
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
