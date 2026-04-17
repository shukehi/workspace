# Order Lifecycle Normalization Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization`
> 范围：在既有 helper / wrapper 拆分完成后，开始处理订单域剩余的 deeper normalization 工作；第一刀优先收口 `updateOrder` 的 dependency assembly，但不改变 API contract 或业务语义。

---

## 1. 背景

订单域已经完成：
- query helper
- read helper（list + single）
- create helper
- update helper
- delete helper
- arrive / bulk-arrive helper（含 entry wrapper）
- stockIn helper（含 entry wrapper）
- support helper

当前剩余复杂度已经不再主要来自“再抽一个 wrapper”，而更多来自：
- service-surface dependency assembly
- create / update / stock-in 等路径的 wiring normalization
- 更深层的 contract / normalization 统一

---

## 2. 本阶段目标

从 helper 拆分过渡到真正的 normalization：
- 让 `order.service.ts` 不仅更薄，而且更少承载大块 dependency assembly
- 优先选择仍然低风险、但已经属于 normalization 的切口

本阶段第一刀优先顺序：
1. `updateOrder` dependency assembly builder
2. 如顺利，再判断 `createOrder` 是否需要同类 normalization

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 duplicate / idempotency / lifecycle 语义
3. 不一次性重写全部 create/update/stock-in 协调层
4. 不引入新依赖
5. 不同时处理前端 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.update.ts`

新增：
- `buildUpdateOrderLifecycleDeps()`

目标：
- 把 update path 的依赖装配从 `order.service.ts` 中拿掉
- 保持 `updateOrderLifecycle()` 本身和现有行为不变

---

## 5. 完成标准

至少满足：

1. `updateOrder` 不再直接内联大块 dependency assembly
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
