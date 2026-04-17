# Branch Progress — refactor/inventory-store-pass7 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-pass7`
> 用途：记录 Inventory store/state 第七轮当前已完成的收口范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续收口 `src/stores/useInventoryStore.ts`，优先处理仍直接留在 store 内的 inventory core action wrapper。

并保持：
- store 对外 contract 不变
- 页面行为不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_PASS7_PLAN_2026-04-17.md`

### 2.2 新增 helper 模块
- `src/features/inventory/inventoryStoreCoreActions.ts`

### 2.3 已从 `useInventoryStore.ts` 抽离的内容
- `fetchInventory`
- `updateMinStock`
- `createInventoryAdjustment`

---

## 3. 相对 main 的提交

- `04fb4e6` — 抽出 Inventory core actions helper

---

## 4. 结构结果

### 之前
`useInventoryStore.ts` 仍直接承载 inventory 主列表与库存调整相关的 action wrapper。

### 现在
这些 action 已经进入：
- `inventoryStoreCoreActions.ts`

这意味着：
1. store 主体进一步接近对外暴露壳
2. core flow / history action / state helper 的边界更清晰
3. 如果后续继续做 deeper partitioning，会更容易按剩余 action surface 判断下一刀

---

## 5. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `tests/inventory-view-guard.test.ts` ✅
- `tests/inventory-receipt-flow.test.ts` ✅
- `tests/inventory-receipt-route-state.test.ts` ✅
- `tests/inventory-route.test.ts` ✅
- `tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 6. 当前是否适合停一下

**适合。**

原因：
1. 当前切片完整且边界清晰
2. 全量门禁已通过
3. store 中最自然的一组 core actions 已完成下沉
4. 下一步如果继续推进，会更接近更深的 partitioning / shell design 决策，而不是同等低风险切口

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支范围的必要性不强
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线
