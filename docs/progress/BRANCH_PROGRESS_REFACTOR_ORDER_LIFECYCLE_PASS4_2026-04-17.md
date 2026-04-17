# Branch Progress — refactor/order-lifecycle-pass4 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass4`
> 用途：记录订单生命周期第四轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把仍直接留在 `server/services/orders/order.service.ts` 中的生命周期流转逻辑下沉，让 service 更接近 orchestration shell。

本轮起步目标：

1. `markArrived`
2. 如果收益足够，再决定是否继续收 `stockInOrder`

并保持：
- API contract 不变
- 状态流转语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS4_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- `markArrived` 的 payload shaping 已从 `order.service.ts` 抽到：
  - `server/services/orders/order.service.arrive.ts`

结果：
- `markArrived` 现在更像 orchestration glue
- arrive 相关 lifecycle helper 边界更一致

---

## 3. 相对 main 的提交

- `5f21ecb` — 把 `markArrived` payload shaping 下沉到 arrive helper

---

## 4. 结构结果

### 之前
`markArrived` 仍在 service 内直接构造：
- `status: 'arrived'`
- `arrived_at` fallback
- 然后再调用 `updateOrder`

### 现在
这些 arrived payload 语义已经进入：
- `order.service.arrive.ts`

这意味着：
1. arrive 生命周期相关逻辑更集中
2. `order.service.ts` 主体进一步减轻
3. 如果后续继续整理 bulk-arrive / arrived flow，共享边界更清楚

---

## 5. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `tests/order-service.test.ts` ✅
- `tests/order-routes.test.ts` ✅
- `tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 6. 剩余可继续推进的点

### 6.1 可继续第三刀
最自然的是：
- 继续收 `stockInOrder`

### 6.2 当前仍集中在 service 内的生命周期大块
- `stockInOrder` 仍是明显的一段事务编排逻辑

但这已经不属于“必须现在立刻继续”的程度，而是下一步是否扩大分支范围的选择。

---

## 7. 当前是否适合停一下

**适合。**

原因：
1. 分支主题清晰
2. 第一刀低风险且行为保持
3. 定向与全量门禁都已绿
4. 这是一个自然的 stop/continue 决策点

---

## 8. 当前建议

### 方案 A：现在封板
如果想保持最小粒度，这里已经可以封板 / merge。

### 方案 B：再做一刀 `stockInOrder`
如果想把订单生命周期第四轮再推进一步，可以继续收 `stockInOrder`，然后再封板。

### 当前偏向
如果按“最稳节奏”排序，我偏向：
> **先停在这里做封板判断。**

因为当前已经有独立主题、完整验证和清晰边界，不需要为了“多做一点”而默认扩大这条分支。

