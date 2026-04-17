# Branch Progress — refactor/order-lifecycle-pass9 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass9`
> 用途：记录订单生命周期第九轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把 `order.service.ts` 中剩余的服务支持逻辑下沉，但本轮优先处理：

- order number allocation
- duplicate auto-order lookup
- unique order_no assertion
- idempotency reserve / release / sync

并保持：
- API contract 不变
- create / update 的 duplicate 与 idempotency 语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS9_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- 新增：
  - `server/services/orders/order.service.support.ts`

已下沉的支持逻辑：
- `allocateNextManualOrderNo`
- `allocateNextAutoOrderNo`
- `assertUniqueOrderNo`
- `findDuplicateAutoOrder`
- `reserveIdempotencyKey`
- `releaseIdempotencyKeys`
- `syncActiveIdempotencyKey`

同时保留了 `OrderService` 上的可替换入口，以兼容现有测试对这些 support hooks 的 stub 行为。

---

## 3. 相对 main 的提交

- `f218889` — 抽出 order support helper 并重接 create/update 依赖

---

## 4. 结构结果

### 之前
`order.service.ts` 仍直接承载：
- manual / auto order number allocation
- duplicate auto-order lookup
- unique order_no assertion
- idempotency reserve / release / sync 的服务支持细节

### 现在
这些共享支持逻辑已经集中到：
- `order.service.support.ts`

这意味着：
1. `order.service.ts` 继续向 orchestration shell 收口
2. create / update 的依赖拼装更显式
3. 订单域里“生命周期 helper”与“共享 support helper”的边界开始分层

---

## 5. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.ts tests/order-routes.test.ts tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 6. 当前是否适合停一下

**适合。**

原因：
1. 当前切片完整且高价值
2. 全量门禁已通过
3. support 逻辑已经从 service 主体中拿掉
4. 继续往下会进入更深的 `getAllOrders` / log-path / service surface normalization，而不是同等级的低风险切口

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支的必要性不强
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线
