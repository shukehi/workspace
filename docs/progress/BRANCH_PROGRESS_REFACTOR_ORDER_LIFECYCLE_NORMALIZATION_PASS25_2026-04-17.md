# Branch Progress — refactor/order-lifecycle-normalization-pass25 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-normalization-pass25`
> 用途：记录订单生命周期 normalization 第二十五刀当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 normalization 阶段继续收束 create/update helper 的 runtime alias 命名。

并保持：
- API contract 不变
- runtime 行为不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS25_PLAN_2026-04-17.md`

### 2.2 已完成的 normalization 切口
- 去掉了 contracts 层纯转发的 lifecycle runtime alias：
  - `OrderLifecycleCoreRuntimeBindings`
  - `OrderLifecycleMutableRuntimeBindings`
  - `OrderLifecycleCreateRuntimeBindings`

### 2.3 结构结果
- `order.service.create.ts` / `order.service.update.ts` 已直接依赖 canonical lifecycle binding contract
- contracts 层不再为 create/update 保留无语义增量的 runtime alias

这让 lifecycle contract surface 更直接，也减少了 helper typing 的中间层噪音。

---

## 3. 相对 main 的提交

- `ae1218b` — 去掉 create/update 的纯转发 runtime alias

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
3. normalization 继续保持在一个可 review 的小切口内
4. 若继续同时处理更多 contracts-layer 命名面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- normalization 仍保持小步推进
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定下一个 normalization 切口
