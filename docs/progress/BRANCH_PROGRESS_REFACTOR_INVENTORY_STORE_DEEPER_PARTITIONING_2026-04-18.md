# Branch Progress — refactor/inventory-store-deeper-partitioning (2026-04-18)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-deeper-partitioning`
> 用途：记录 Inventory store/state 进入 deeper partitioning 后第一刀已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 `useInventoryStore.ts` 已经成为薄壳后，继续做一刀低风险的 deeper partitioning：
- 把 export-only action surface 从 action composition 中拆出去
- 保持页面行为、导出行为、store 对外暴露面不变

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PLAN_2026-04-18.md`

### 2.2 已完成的切口
新增：
- `src/features/inventory/inventoryStoreExportActions.ts`

修改：
- `src/features/inventory/inventoryStoreActions.ts`
- `tests/inventory-view-guard.test.ts`

### 2.3 结构结果
- `inventoryStoreActions.ts` 不再直接混入 export-only surface
- export actions 进入独立 helper：
  - `createInventoryExportActions()`
- action composition 层更聚焦在：
  - core actions
  - history actions
  - flow actions

---

## 3. 相对 main 的提交

- `81e792b` — 把 Inventory export action surface 从 composition 层拆到独立 helper

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
3. deeper partitioning 仍保持在一个可 review 的小切口内
4. 如果继续同时处理更多 regrouping 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- Inventory 线重新进入可持续的小步 partitioning
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定 Inventory 是否继续或切回订单域
