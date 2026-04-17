# Branch Progress — refactor/order-lifecycle-normalization-pass29 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-normalization-pass29`
> 用途：记录订单生命周期 normalization 第二十九刀当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 normalization 阶段继续收束 stock-in 侧的 helper/service alias。

并保持：
- API contract 不变
- runtime 行为不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS29_PLAN_2026-04-17.md`

### 2.2 已完成的 normalization 切口
- 去掉了 stock-in 侧 alias：
  - `OrderStatusGuardBindings`
  - `OrderStockInHelperDeps`
  - `OrderStockInServiceDeps`

### 2.3 结构结果
- `order.stockin.ts` 现在直接依赖 canonical contract fragment 组合
- contracts 层删掉了一组只服务 stock-in helper 的命名中转
- stock-in helper 的 typing 层次与其它 helper 更接近

这让 stock-in typing 更直接，也减少了 contracts 层继续整理时的局部噪音。

---

## 3. 相对 main 的提交

- `5d7aef7` — 去掉 stock-in 侧的 helper/service alias

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
4. 若继续同时处理更多 contracts-layer naming 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- normalization 仍保持小步推进
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定下一个 normalization 切口
