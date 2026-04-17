# Order Lifecycle Pass 5 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass5`
> 范围：继续收口订单生命周期中仍直接留在 `order.service.ts` 的事务编排逻辑，优先处理 `stockInOrder`。

---

## 1. 背景

订单域已经完成过：

- create / update data shaping 收口
- delete lifecycle helper
- bulk arrive lifecycle helper
- markArrived payload helper

当前 `server/services/orders/order.service.ts` 中最明显剩余的大型生命周期块是：
- `stockInOrder`

这段逻辑仍直接承载：
- transaction 开启/回滚
- order lookup
- ready-state assertion
- stock-in update 组装
- order.update + commit + refetch

---

## 2. 本轮目标

优先把 `stockInOrder` 的事务编排进一步下沉，使 `order.service.ts` 更接近真正的 orchestration shell。

本轮优先顺序：
1. 下沉 `stockInOrder` transaction flow
2. 如果这一刀顺利，再决定是否继续收更深的 stock-in error / result shaping

---

## 3. 本轮不做的事

1. 不改 stock-in API contract
2. 不改 inventory receipt contract
3. 不改 stock-in 业务语义
4. 不引入新依赖
5. 不重写 receipt item / quantity 规则

---

## 4. 推荐切口

建议继续围绕：
- `server/services/orders/order.stockin.ts`

优先新增：
- stockIn lifecycle orchestration helper

让 `order.service.ts` 中的 `stockInOrder` 尽量只保留：
- 参数入口
- helper 调用
- 依赖拼装

---

## 5. 完成标准

至少满足：

1. `stockInOrder` 不再直接在 `order.service.ts` 中内联主要事务编排
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
