# Branch Progress — refactor/order-lifecycle-normalization-pass14 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-normalization-pass14`
> 用途：记录订单生命周期 normalization 第十四刀当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 normalization 阶段继续统一 lifecycle helpers 之间的 shared dependency-core contracts。

并保持：
- API contract 不变
- runtime 行为不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS14_PLAN_2026-04-17.md`

### 2.2 已完成的 normalization 切口
- 在 `server/services/orders/order.service.contracts.ts` 中新增：
  - `OrderLifecycleDepsCore`
  - `OrderLifecycleDepsPersistence`

### 2.3 结构结果
- `order.service.create.ts` / `order.service.update.ts` / `order.stockin.ts` 不再各自重复组合同一组 transaction / by-id / persistence contract fragment
- lifecycle helper deps typing 现在复用同一组更高层 shared contract

这让 lifecycle helper 之间的 dependency-core surface 更一致，也为后续 deeper contract shaping 留出更清晰的落点。

---

## 3. 相对 main 的提交

- `40643f8` — 归一 lifecycle helper shared dependency-core contracts

---

## 4. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.ts tests/order-routes.test.ts tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 5. 当前是否适合停一下

**适合。**

原因：
1. 当前切片完整且边界清晰
2. 全量门禁已通过
3. normalization 已继续推进，但仍保持在一个可 review 的小切口内
4. 继续往下若同时碰更多 shared contract 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- normalization 仍保持小步推进
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定下一个 normalization 切口
