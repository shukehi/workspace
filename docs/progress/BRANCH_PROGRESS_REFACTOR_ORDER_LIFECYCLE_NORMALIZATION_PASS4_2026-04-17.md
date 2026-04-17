# Branch Progress — refactor/order-lifecycle-normalization-pass4 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-normalization-pass4`
> 用途：记录订单生命周期 normalization 第四刀当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 normalization 阶段继续收口 `stockInOrder` 的 dependency assembly。

并保持：
- API contract 不变
- stock-in side effects 不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS4_PLAN_2026-04-17.md`

### 2.2 已完成的 normalization 切口
- `stockInOrder` 的 dependency assembly 已归一到：
  - `buildStockInOrderLifecycleDeps()` in `server/services/orders/order.stockin.ts`

### 2.3 结构结果
- `order.service.ts` 不再直接内联整块 stock-in dependency wiring
- `order.stockin.ts` 现在同时承接：
  - stock-in lifecycle logic
  - stock-in lifecycle deps builder
  - stock-in entry wrapper

这让 stock-in path 的行为逻辑与 wiring 逻辑更集中在同一模块里。

---

## 3. 相对 main 的提交

- `2136e7a` — 归一 stock-in lifecycle dependency assembly

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
4. 继续往下如果同时碰多条 lifecycle path，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- normalization 仍保持小步推进
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定下一个 normalization 切口
