# Branch Progress — refactor/order-lifecycle-pass3 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass3`
> 用途：记录订单生命周期第三轮收口当前已经完成的范围、验证证据，以及是否适合在当前点封板。

---

## 1. 分支目标

继续把仍然集中在 `server/services/orders/order.service.ts` 中的生命周期编排逻辑下沉，使 `OrderService` 更接近真正的 orchestration shell。

本轮的起步目标是优先处理：

1. `deleteOrder`
2. `bulkMarkArrived`

并保持：

- API contract 不变
- 业务语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS3_PLAN_2026-04-17.md`

### 2.2 已抽出的 lifecycle helper
- `server/services/orders/order.service.delete.ts`
- `server/services/orders/order.service.arrive.ts`

### 2.3 `order.service.ts` 已收口的方法
- `deleteOrder`
- `bulkMarkArrived`

结果：
- `deleteOrder` 的 busy-retry + 删除顺序不再直接堆在主 service 里
- `bulkMarkArrived` 的循环执行 / 结果聚合 / per-id 错误序列化不再直接堆在主 service 里

---

## 3. 相对 main 的提交

- `aaeab9b` — 抽出 `deleteOrder` retry orchestration
- `01e449f` — 抽出 `bulkMarkArrived` orchestration

---

## 4. 结构结果

### 之前
`order.service.ts` 仍直接承载：
- delete lifecycle retry / delete sequence
- bulk arrive lifecycle loop / aggregation

### 现在
这些生命周期编排已经进入独立 helper 模块：
- `order.service.delete.ts`
- `order.service.arrive.ts`

这意味着：

1. `OrderService` 主体更聚焦于 orchestration shell
2. lifecycle 细节更容易单独定位与继续整理
3. 下一刀若继续做更深层 lifecycle cleanup，有了更清晰的模块落点

---

## 5. 验证证据

### 当前已完成的定向验证
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.ts tests/order-routes.test.ts tests/governance-boundary-guard.test.ts` ✅

### 当前尚未再次执行的全量门禁
这一轮只针对 pass 3 的局部变更做了定向验证，尚未重新跑：
- `npm test`
- `npm run build`

说明：
- 当前还不是“最终封板已验证完成”状态
- 但已经到了一个**可判断是否继续第三刀**的稳定节点

---

## 6. 剩余可继续推进的点

### 6.1 继续第三刀
可以继续考虑：
- `markArrived`
- 以及更小范围的 arrive lifecycle shared helper 整理

### 6.2 更深的 lifecycle cleanup
如果继续往下走，后续才会碰到：
- 更深的 delete / arrive / stock-in contract 统一
- 更深的 lifecycle shared error shaping

---

## 7. 当前是否适合停一下

**适合停一下。**

原因：

1. 分支已经有清晰主题
2. 两刀都属于低风险、行为保持型收口
3. 定向验证持续全绿
4. 当前正好是一个适合判断“继续第三刀还是先封板”的自然阶段点

---

## 8. 当前建议

最稳的下一步有两种：

### 方案 A：现在封板
先补全：
- `npm test`
- `npm run build`

如果全绿，就可以封板 / merge。

### 方案 B：再做第三刀后再封板
如果继续推进，最自然的是：
- 再收 `markArrived`
- 然后再跑全量门禁、做阶段总结、封板

### 当前偏向
如果按“最稳节奏”排序，我会偏向：
> **先补全全量门禁，再决定是否继续第三刀。**

因为当前已经有足够清晰的边界，不必为了“再多做一点”而默认继续扩大分支。

