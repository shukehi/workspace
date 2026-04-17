# Branch Progress — refactor/order-lifecycle-pass7 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass7`
> 用途：记录订单生命周期第七轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把 `order.service.ts` 中剩余的核心服务编排逻辑下沉，但本轮优先处理：

- `createOrder`

并保持：
- API contract 不变
- duplicate / fallback / idempotency 业务语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS7_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- `createOrder()` 的主要 orchestration 已从 `order.service.ts` 下沉到：
  - `server/services/orders/order.service.create.ts`

helper 现在承接：
- transaction/retry loop
- auto/manual order number分配重试
- duplicate / unique 检查
- create + items persistence
- idempotency key reservation
- persisted fallback / duplicate fallback

---

## 3. 相对 main 的提交

- `8ae4829` — 抽出 createOrder orchestration helper

---

## 4. 结构结果

### 之前
`createOrder()` 仍直接在 service 内承载：
- transaction loop
- duplicate / unique fallback
- create + items persistence
- idempotency reservation
- persisted fallback

### 现在
这些主流程已经集中到：
- `order.service.create.ts`

这意味着：
1. `order.service.ts` 再次向 orchestration shell 收口
2. create lifecycle 的落点更清晰
3. 如果未来继续做 `updateOrder` deeper cleanup，不会再和 create path 混在一起

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
1. 当前切片完整且高价值
2. 全量门禁已通过
3. 当前已经形成自然阶段点
4. 下一步若继续 `updateOrder` deeper cleanup，会显著扩大分支复杂度

---

## 7. 当前建议

### 方案 A：现在封板
如果希望保持最小粒度，这里已经可以封板 / merge。

### 方案 B：继续第二刀
如果继续推进，最自然的是：
- `updateOrder` orchestration deeper cleanup

但这已经明显比当前切片更复杂。

### 当前偏向
如果按“最稳节奏”排序，我偏向：
> **先停在这里做封板判断。**

因为当前已经是一个完整、独立、全量验证通过的阶段切片。

