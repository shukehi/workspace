# Branch Progress — refactor/inventory-store-deeper-partitioning-pass15 (2026-04-19)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-deeper-partitioning-pass15`
> 用途：记录 Inventory deeper partitioning 第十五刀已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 reverse control typing 已进一步归位后，继续把 reverse dialog behavior ownership 归回 owner composable，并退役单独的 wrapper helper。

并保持：
- 页面行为不变
- 交互逻辑不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS15_2026-04-19.md`

### 2.2 已完成的切口
修改：
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`
删除：
- `src/features/inventory/composables/useInventoryReverseDialogs.ts`

### 2.3 结构结果
- `requestReverseOutbound` 已归回 outbound state owner：
  - `useInventoryOutboundState.ts`
- `resetReceiptReverseQuantityToMax` 已归回 receipt flow owner：
  - `useInventoryReceiptFlow.ts`
- `Inventory.vue` 现在直接依赖 owner composable 提供的 reverse behavior / controls
- `useInventoryReverseDialogs.ts` 已退役

这让 reverse dialog path 不再需要一层纯转发包装，也让 owner composable 与行为 ownership 保持一致。

---

## 3. 相对 main 的提交

- `7adc42a` — 删除 reverse dialog wrapper，并把行为归回 owner composable

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
