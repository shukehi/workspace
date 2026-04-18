# Branch Progress — refactor/inventory-store-deeper-partitioning-pass2 (2026-04-18)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-deeper-partitioning-pass2`
> 用途：记录 Inventory deeper partitioning 第二刀已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 export surface 已独立后，继续把 stateful action composition 从最终 action shell 中拆开。

并保持：
- 页面行为不变
- API contract 不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS2_2026-04-18.md`

### 2.2 已完成的切口
新增：
- `src/features/inventory/inventoryStoreStatefulActions.ts`

修改：
- `src/features/inventory/inventoryStoreActions.ts`
- `tests/inventory-view-guard.test.ts`

### 2.3 结构结果
- `inventoryStoreActions.ts` 现在只负责最终 surface 组合：
  - `statefulActions`
  - `exportActions`
- core / history / flow 的 wiring 已统一下沉到：
  - `inventoryStoreStatefulActions.ts`

这让 Inventory action composition 层次更清楚，也让后续继续做 deeper partitioning 时有更清晰的切点。

---

## 3. 相对 main 的提交

- `3d4d1f7` — 把 stateful action composition 从最终 action shell 中拆到独立 helper

---

## 4. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 5. 当前是否适合停一下

**适合。**

原因：
1. 当前切片完整且边界清晰
2. 全量门禁已通过
3. deeper partitioning 继续保持在一个可 review 的小切口内
4. 如果继续同时处理更多 regrouping 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- Inventory 线继续稳定拿到收益
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定是否继续留在 Inventory 或重新评估主线
