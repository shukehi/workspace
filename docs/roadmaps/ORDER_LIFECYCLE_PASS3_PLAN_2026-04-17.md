# Order Lifecycle Pass 3 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass3`
> 范围：继续收口订单生命周期中仍集中在 `order.service.ts` 的剩余编排逻辑，但不改变现有 API contract 或业务语义。

---

## 1. 背景

订单域已经完成过两轮收口：

- createOrder data shaping 收口
- updateOrder context / validation / next values 收口
- stockInOrder orchestration 初步收口
- helper 抽离

当前 `server/services/orders/order.service.ts` 仍约 **563 行**，剩余热点主要集中在：

- `deleteOrder`
- `bulkMarkArrived`
- 更深的 lifecycle helper / error shaping / contract 统一

---

## 2. 本轮目标

优先把仍然直接堆在 service 内的生命周期编排逻辑继续下沉，让 `order.service.ts` 更接近真正的 orchestration shell。

本轮优先顺序：

1. `deleteOrder`
2. `bulkMarkArrived`
3. 如果前两项顺利，再判断是否继续收更深的 lifecycle helper

---

## 3. 本轮不做的事

1. 不改变 orders API contract
2. 不改变状态流转语义
3. 不触碰 inventory receipt / outbound contract
4. 不做新的 domain policy 重写
5. 不引入新依赖

---

## 4. 推荐拆分方向

### 4.1 deleteOrder
建议抽到独立 helper，例如：
- `server/services/orders/order.service.delete.ts`

优先下沉：
- retry / busy handling
- delete sequence
- idempotency key / order items / order 删除顺序

### 4.2 bulkMarkArrived
建议抽到独立 helper，例如：
- `server/services/orders/order.service.arrive.ts`

优先下沉：
- bulk id normalization 后的循环执行
- per-id error serialization
- 结果对象构造

---

## 5. 完成标准

至少满足：

1. `order.service.ts` 中 `deleteOrder` / `bulkMarkArrived` 明显收口
2. 行为不变
3. 相关测试继续通过
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
