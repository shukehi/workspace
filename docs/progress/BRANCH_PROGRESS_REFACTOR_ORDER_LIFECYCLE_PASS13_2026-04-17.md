# Branch Progress — refactor/order-lifecycle-pass13 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-pass13`
> 用途：记录订单生命周期第十三轮当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续把 `order.service.ts` 中剩余的 stock-in entry surface 下沉，但本轮优先处理：

- `stockInOrder`

并保持：
- API contract 不变
- stock-in 语义不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_PASS13_PLAN_2026-04-17.md`

### 2.2 已完成的收口
- `stockInOrder()` 的主要 entry wrapper 已从 `order.service.ts` 下沉到：
  - `server/services/orders/order.stockin.ts`

helper 现在承接：
- stock-in entry wrapper
- stock-in lifecycle orchestration

---

## 3. 相对 main 的提交

- `22a399c` — 抽出 stockInOrder entry wrapper

---

## 4. 结构结果

### 之前
`order.service.ts` 仍直接承载：
- stockInOrder wrapper
- stock-in deps 入口拼装

### 现在
这些入口已经集中到：
- `order.stockin.ts`

这意味着：
1. `order.service.ts` 再次向 orchestration shell 收口
2. stock-in lifecycle 的辅助边界更一致
3. 订单域下一步如果继续做更深层 normalization，会更容易聚焦在真正剩余的 service-surface 复杂度上

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
3. stock-in entry wrapper 现在也已下沉
4. 继续往下会进入更深层 service-surface normalization，而不是同等级的低风险切口

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支的必要性不强
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线
