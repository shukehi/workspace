# Branch Progress — refactor/inventory-store-pass4 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-pass4`
> 用途：记录 Inventory store/state 第四轮当前已完成的收口范围、验证证据，以及当前分支是否适合封板。

---

## 1. 分支目标

继续收口 `src/stores/useInventoryStore.ts`，优先处理剩余的 inventory 核心 flow：

- inventory list fetch
- min-stock update
- adjustment create / item merge

并保持：
- 页面行为不变
- API contract 不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_PASS4_PLAN_2026-04-17.md`

### 2.2 新增 helper 模块
- `src/features/inventory/inventoryStoreCoreFlows.ts`

### 2.3 已从 `useInventoryStore.ts` 抽离的内容
- inventory list fetch flow
- min-stock update flow
- adjustment create / item merge flow

---

## 3. 相对 main 的提交

- `3815744` — 抽出 Inventory core flows，并让 store 复用 helper

---

## 4. 结构结果

### 之前
`useInventoryStore.ts` 仍直接承载：
- inventory 列表拉取
- min-stock 更新
- adjustment 创建与 item 合并

### 现在
这些块已经进入：
- `inventoryStoreCoreFlows.ts`

这意味着：
1. store 更进一步收敛为状态容器 + 轻量 orchestration shell
2. core inventory flow 与 history / paging / outbound / location flow 的边界更清晰
3. 如果后续还要继续做更深层 state partitioning，判断会更容易、更基于真实剩余复杂度

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

## 6. 当前是否适合封板

**适合。**

原因：
1. 当前切口完整且边界清晰
2. 全量门禁已通过
3. `useInventoryStore.ts` 已明显收薄
4. 下一步如果继续推进，就不再是“同等低风险的一刀”，而会进入更深层的 state partitioning 决策

---

## 7. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- 继续扩大分支的必要性不强
- 最稳妥的方式是先把这轮成果并回 `main`，再根据最新状态重新排序后续主线

