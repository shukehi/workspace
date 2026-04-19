# Branch Progress — refactor/inventory-store-deeper-partitioning-pass28 (2026-04-19)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-deeper-partitioning-pass28`
> 用途：记录 Inventory deeper partitioning 第二十八刀已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 location query/dialog state 已各自独立拥有后，继续删除 `useInventoryLocationState.ts` 这一层薄组合包装。

并保持：
- 页面行为不变
- location 查询与 dialog 逻辑不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS28_2026-04-19.md`

### 2.2 已完成的切口
修改：
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`
删除：
- `src/features/inventory/composables/useInventoryLocationState.ts`

### 2.3 结构结果
- `Inventory.vue` 现在直接依赖：
  - `useInventoryLocationQueryState.ts`
  - `useInventoryLocationDialogState.ts`
- location thin wrapper 已退役
- location query owner 与 dialog owner 现在直接暴露给 view 层使用

这让 location path 不再需要一层纯转发组合包装，也让 owner 边界保持一致。

---

## 3. 相对 main 的提交

- `110a6d9` — 删除 location wrapper，并把 view 直接接到 canonical owners

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
- Inventory 线继续稳定拿到 ownership / helper deletion 收益
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定是否继续留在 Inventory 或重新评估主线
