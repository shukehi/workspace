# Order Lifecycle Pass 7 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass7`
> 范围：继续收口 `order.service.ts` 中剩余的核心服务编排，优先处理 `createOrder` / `updateOrder` 的更深层事务与 fallback orchestration。

---

## 1. 背景

订单域已经完成：
- query helper
- delete lifecycle helper
- arrive / bulk-arrive helper
- stockIn transaction orchestration helper

当前 `order.service.ts` 仍保留的高复杂块，主要集中在：
- `createOrder`
- `updateOrder`

这两段逻辑仍直接承载：
- transaction 循环 / rollback
- duplicate / unique fallback 处理
- persisted fallback 处理
- idempotency key 协调

---

## 2. 本轮目标

优先把 `createOrder` 的事务循环与 fallback orchestration 继续下沉，使 `order.service.ts` 更接近 orchestration shell。

本轮优先顺序：
1. `createOrder`
2. 如果第一刀顺利，再判断是否继续 `updateOrder`

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / fallback 的业务语义
3. 不改 manual/auto order number 行为
4. 不引入新依赖
5. 不在第一刀里同时改 create + update

---

## 4. 推荐切口

建议继续围绕：
- `server/services/orders/order.service.create.ts`

优先新增：
- create lifecycle orchestration helper

让 `order.service.ts` 中的 `createOrder()` 尽量只保留：
- 入口参数
- helper 调用
- 少量依赖拼装

---

## 5. 完成标准

至少满足：

1. `createOrder()` 不再直接承载主要 transaction/fallback orchestration
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
