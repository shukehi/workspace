# Branch Progress — refactor/order-lifecycle-pass5 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass5`
> 用途：记录订单生命周期第五轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把仍直接留在 `server/services/orders/order.service.ts` 中的大型生命周期编排逻辑下沉，优先处理 `stockInOrder`。

并保持：
- API contract 不变
- stock-in 业务语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS5_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- `stockInOrder` 的事务编排已经从 `order.service.ts` 下沉到：
  - `server/services/orders/order.stockin.ts`

结果：
- `order.service.ts` 中 `stockInOrder()` 已更接近 orchestration glue
- stock-in 相关的 transaction / lookup / update / commit / refetch 逻辑更集中到 stock-in helper 模块中

---

## 3. 相对 main 的提交

- `fc9e675` — 把 `stockInOrder` 事务编排下沉到 `order.stockin.ts`

---

## 4. 结构结果

### 之前
`stockInOrder` 仍直接在 service 内承载：
- transaction 创建
- order lookup
- ready-state assertion
- update resolution
- persistence + commit + refetch

### 现在
这些主流程已经进入：
- `order.stockin.ts`

这意味着：
1. `order.service.ts` 主体再次收薄
2. stock-in 生命周期边界更集中
3. 如果未来继续做 stock-in deeper cleanup，会有更清晰的单模块落点

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

## 6. 当前是否适合停一下

**适合。**

原因：
1. 本轮目标非常清晰且已经完成
2. 这是当前最值得处理的大型 lifecycle block
3. 定向与全量门禁都已通过
4. 当前已形成一个很自然的 stop/continue 决策点

---

## 7. 当前建议

### 方案 A：现在封板
如果你希望维持最小粒度，这里已经可以封板 / merge。

### 方案 B：继续更深的 stock-in cleanup
如果继续推进，下一步应重新判断是否真的值得继续在同一分支扩展：
- stock-in error shaping
- 更深的 lifecycle contract 统一

### 当前偏向
如果按“最稳节奏”排序，我偏向：
> **先停在这里做封板判断。**

因为当前已经有完整主题、完整验证和清晰边界，不需要为了“再多做一点”而默认扩大这条分支。

