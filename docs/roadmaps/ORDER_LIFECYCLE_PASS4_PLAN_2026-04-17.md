# Order Lifecycle Pass 4 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass4`
> 范围：继续收口订单生命周期中仍直接留在 `order.service.ts` 的流转逻辑，但不改变 API contract 或业务语义。

---

## 1. 背景

订单域已经完成过：

- helper 抽离
- create / update data shaping 收口
- stock-in 第一轮 orchestration 收口
- delete lifecycle helper
- bulk arrive lifecycle helper

当前 `server/services/orders/order.service.ts` 仍约 **524 行**，剩余最明显热点是：

- `markArrived`
- `stockInOrder`
- 更深的 lifecycle contract / error shaping

---

## 2. 本轮目标

优先把仍直接留在 service 中、且适合低风险抽离的生命周期逻辑继续下沉。

本轮优先顺序：

1. `markArrived`
2. 如果第一刀顺利，再看 `stockInOrder` 是否还能再收一刀

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改状态流转语义
3. 不改 inventory receipt contract
4. 不引入新依赖
5. 不做新的 domain policy 重写

---

## 4. 推荐拆分方向

### 4.1 markArrived
建议继续围绕：
- `server/services/orders/order.service.arrive.ts`

优先下沉：
- arrive payload shaping
- markArrived helper 调用
- 让 service 中只保留参数入口与 orchestration glue

### 4.2 stockInOrder（可选第二刀）
如果继续做：
- 再次收口 transaction 内 orchestration 细节
- 但不改变 stock-in 的行为边界

---

## 5. 完成标准

至少满足：

1. `markArrived` 不再直接在 `order.service.ts` 内联 payload shaping
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
