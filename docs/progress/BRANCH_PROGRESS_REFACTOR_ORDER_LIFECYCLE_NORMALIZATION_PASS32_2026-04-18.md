# Branch Progress — refactor/order-lifecycle-normalization-pass32 (2026-04-18)

> 状态：阶段性总结文档。
> 分支：`refactor/order-lifecycle-normalization-pass32`
> 用途：记录订单生命周期 normalization 第三十二刀当前已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 normalization 阶段继续收束 stock-in 专属的 service contract 定义。

并保持：
- API contract 不变
- runtime 行为不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS32_PLAN_2026-04-18.md`

### 2.2 已完成的 normalization 切口
- shared contracts 层不再保留：
  - `OrderStockInServiceDeps`

### 2.3 结构结果
- `order.stockin.ts` 现在拥有自己的 `StockInOrderServices` 本地 type
- shared contracts 层进一步聚焦在 genuinely cross-helper 的 surface
- stock-in service 依赖 ownership 回到了 stock-in helper 模块内

这让 shared contracts 层更专注，也减少了 contracts 里继续累积 helper-private shape 的风险。

---

## 3. 相对 main 的提交

- `0de5c1d` — 将 stock-in 专属 service contract 从 shared contracts 下沉回 stock-in 模块

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
4. 若继续同时处理更多 contracts-layer ownership 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- normalization 仍保持小步推进
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定下一个 normalization 切口
