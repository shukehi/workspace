# Branch Progress — refactor/order-lifecycle-pass8 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass8`
> 用途：记录订单生命周期第八轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把 `order.service.ts` 中剩余的核心服务编排逻辑下沉，但本轮优先处理：

- `updateOrder`

并保持：
- API contract 不变
- duplicate / fallback / idempotency 业务语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS8_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- `updateOrder()` 的主要 orchestration 已从 `order.service.ts` 下沉到：
  - `server/services/orders/order.service.update.ts`

helper 现在承接：
- transaction orchestration
- duplicate / unique 检查与 fallback
- item replacement
- idempotency key 同步/释放
- persisted fallback

---

## 3. 相对 main 的提交

- `1ae0e1c` — 抽出 updateOrder orchestration helper

---

## 4. 结构结果

### 之前
`updateOrder()` 仍直接在 service 内承载：
- transaction/rollback
- duplicate / unique 检查
- order update + items replace
- idempotency 同步
- persisted fallback

### 现在
这些主流程已经集中到：
- `order.service.update.ts`

这意味着：
1. `order.service.ts` 再次向 orchestration shell 收口
2. update lifecycle 的落点更清晰
3. 订单域里最大的 create/update 两块现在都已有独立 helper 边界

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
3. create / update 两个最大 orchestration block 现在都已下沉
4. 继续往下会进入更深层 lifecycle contract / error shaping 统一，而不是同等级的低风险切口

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支的必要性不强
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线

