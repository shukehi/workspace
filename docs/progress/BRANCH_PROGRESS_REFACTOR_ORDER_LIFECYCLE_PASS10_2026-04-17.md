# Branch Progress — refactor/order-lifecycle-pass10 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass10`
> 用途：记录订单生命周期第十轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把 `order.service.ts` 中剩余的低风险 read-path / service-surface 支撑逻辑下沉，但本轮优先处理：

- `getAllOrders`

并保持：
- API contract 不变
- 日志语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS10_PLAN_2026-04-17.md`

### 2.2 新增 helper 模块
- `server/services/orders/order.service.read.ts`

### 2.3 已从 `order.service.ts` 抽离的内容
- `getAllOrders`
- invalid `created_at` log normalization path

---

## 3. 相对 main 的提交

- `$(git rev-parse --short HEAD)` — 抽出 OrderService read helper

---

## 4. 结构结果

### 之前
`order.service.ts` 仍直接承载：
- category where 组装
- invalid created_at logging path
- 全量读路径序列化

### 现在
这些读路径支撑逻辑已经进入：
- `order.service.read.ts`

这意味着：
1. `order.service.ts` 进一步向 orchestration shell 收口
2. read-path 与 lifecycle/helper 边界更清晰
3. 如果后续继续做 deeper lifecycle/service-surface cleanup，会更容易按剩余复杂度判断下一刀

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
1. 当前切片完整且边界清晰
2. 全量门禁已通过
3. `order.service.ts` 中剩余的低风险 read-path 支撑块已完成下沉
4. 下一步如果继续推进，会更接近更深的 service-surface normalization，而不是同等低风险切口

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支范围的必要性不强
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线
